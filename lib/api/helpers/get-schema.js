'use strict';


//---------//
// Imports //
//---------//

const bPromise = require('bluebird')
  , fp = require('lodash/fp')
  , path = require('path')
  , sqlite3 = require('sqlite3')
  , utils = require('../../utils')
  ;


//------//
// Init //
//------//

sqlite3.verbose();
bPromise.promisifyAll(sqlite3.Database.prototype);

const queries = getQueries()
  , reduceWithKey = utils.reduceWithKey
  ;

let db; // set in `bGetDb`.  Needs to have file-wide scope


//------//
// Main //
//------//

function getSchema(dbPath) {
  return bGetDb(dbPath)
    .then(() => db.allAsync(queries.allTablesAndViews))
    .then(rows => {
      const tableAndViewNames = fp.flow(
        fp.partition(['type', 'table'])
        , reduceWithKey(
          (res, aPartition, index) =>
            (index === 0)
              ? fp.set('tables', fp.map('name', aPartition), res)
              : fp.set('views', fp.map('name', aPartition), res)
          , {}
        )
      )(rows);

      // ugly I know, but I'm trying to pass tableAndViewNames without conflicting
      //   with the actual table and view names
      return bPromise.props({
        partitioned: tableAndViewNames
        , flat: bPromise.props(
          fp.reduce(
            (res, name) => fp.set(name, db.allAsync(queries.getPragmaTable(name)), res)
            , {}
            , fp.flatMap(fp.identity, tableAndViewNames)
          )
        )
      });
    })
    .then(({ flat, partitioned }) => {
      const tableAndViewToPragma = fp.mapValues(
        fp.flow(
          fp.sortBy('cid')
          , fp.map(modifyColumnProperties)
        )
        , flat
      );

      let schema = {
        dbPath: path.resolve(dbPath)
      };

      schema = fp.assign(
        schema
        , fp.mapValues(
          fp.reduce((res, name) => fp.set(name, tableAndViewToPragma[name], res), {})
          , partitioned
        )
      );

      return schema;
    });
}


//-------------//
// Helper Fxns //
//-------------//

// Slim down and reword some of the column properties so we have something
//   sensible to work with
function modifyColumnProperties(cols) {
  return fp.flow(
    fp.omit('cid')
    , fp.omitBy(isUnnecessary)
    , fp.mapKeys(renamePragmaProperties)
    , booleansToFlags
  )(cols);
}

// by the time this is called, falsey booleans will have been omitted
function booleansToFlags(val) {
  const possibleFlags = ['isNullable', 'isPrimaryKey'];

  let flags = fp.intersection(possibleFlags, fp.keys(val));

  if (flags.length) {
    // unsure why notnull can be set to 0 while also pk set to 1 and type set to
    //   INTEGER.  Those are supposed to mean the value is set to rowid (and
    //   thus never null).  Let's set it to just isPrimaryKey for now.
    let filteredFlags = flags;
    if (flags.length === 2) filteredFlags = ['isPrimaryKey'];

    val.flags = filteredFlags;
    val = fp.omitAll(flags, val);
  }

  return val;
}

// just make some of the property names more readable.  I understand this may
//   have implications in debugging - but I first want to get this program
//   working prior to dealing with badly named properties.
function renamePragmaProperties(key) {
  switch(key) {
    case 'notnull':
      return 'isNullable';
    case 'dflt_value':
      return 'default';
    case 'pk':
      return 'isPrimaryKey';
    default:
      return key;
  }
}

// omits properties where defaults can be assumed.  This reduces verbosity.
function isUnnecessary(val, key) {
  switch(key) {
    case 'type':
      return !val;
    case 'notnull':
      return val;
    case 'dflt_value':
      return !val;
    case 'pk':
      return !val;
  }
}

function bGetDb(dbPath) {
  return new bPromise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, err => (err) ? reject(err) : resolve());
  });
}

function getQueries() {
  return {
    allTablesAndViews: "select name, type from sqlite_master where type='table' or type='view';"
    , getPragmaTable: tbl => `pragma table_info(${tbl})`
  };
}


//---------//
// Exports //
//---------//

module.exports = getSchema;
