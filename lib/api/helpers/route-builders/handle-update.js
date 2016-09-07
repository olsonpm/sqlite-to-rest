'use strict';


//---------//
// Imports //
//---------//

const common = require('./common')
  , errIds = require('./err-ids')
  , fp = require('lodash/fp')
  ;


//------//
// Init //
//------//

const {
    attachError, bRunQuery, getPkColumnNames
    , hasFlag, parseQueryForPkColumns
  } = common
  , qsErrIds = errIds.update.queryString
  , rbErrIds = errIds.update.requestBody
  ;


//------//
// Main //
//------//


const handleHead = (ctx, next, name, columns, connections) => {
  let pkColumnNames = getPkColumnNames(columns)
    , updateRow = `UPDATE ${name}`
    ;

  // validate querystring to ensure all pks were passed and nothing else
  const parsedQuery = parseQueryForPkColumns(ctx.decodedQuerystring, pkColumnNames, qsErrIds);

  if (fp.invoke('hasErr', parsedQuery)) {
    return attachError(ctx, parsedQuery);
  }

  // now validate the payload to ensure valid non-pk columns were passed

  const reqBody = ctx.request.body
    , err = getRequestBodyError(reqBody, columns);

  if (err) {
    return attachError(ctx, err);
  }

  // so far so good - movin' on

  let {query, params} = getUpdatequery(ctx.query, reqBody, updateRow)
    , where
    ;

  return bRunQuery(connections.readWrite, query, params)
    .then(() => {
      ctx.status = 201;
      ({ where, params } = getWhereClause(ctx.query));

      query = `SELECT * FROM ${name} WHERE ` + where;

      return connections.readOnly.getAsync(query, params);
    })
    .then(row => {
      ctx.body = row;
      ctx.set('content-location', `${ctx.path}?${ctx.decodedQuerystring}`);
      return next();
    })
    .catch(err => {
      ctx.status = 500;
      console.error(err);
    });
};


//-------------//
// Helper Fxns //
//-------------//

function getRequestBodyError(reqBody, columns) {
  const allowedColumns = getNonPkColumnNames(columns)
    , requestedColumns = fp.keys(reqBody)
    , parseErr = 'Error while parsing the request body: ';


  if (!fp.size(reqBody)) {
    return {
      msg: parseErr + "Update requires a non-empty request body"
      , id: rbErrIds.mustBeNonEmpty
    };
  }

  const invalidColumns = fp.without(allowedColumns, requestedColumns);
  if (fp.size(invalidColumns)) {
    return {
      msg: parseErr + 'Invalid columns passed.\n'
        + 'invalid columns: ' + invalidColumns.join(', ')
        + '\navailable columns: ' + allowedColumns.join(', ')
      , id: rbErrIds.invalidColumns
    };
  }
}

function getNonPkColumnNames(columns) {
  return fp.flow(
    fp.values
    , fp.reject(hasFlag('isPrimaryKey'))
    , fp.map('name')
  )(columns);
}

function getUpdatequery(query, reqBody, queryStart) {
  const setClause = getSetClause(reqBody)
    , whereClause = getWhereClause(query);

  return {
    query: queryStart + setClause.set + ' WHERE ' + whereClause.where
    , params: setClause.params.concat(whereClause.params)
  };
}

function getSetClause(reqBody) {
  return {
    set: ' SET ' + fp.flow(
      fp.keys
      , fp.map(col => col + ' = ?')
      , fp.join(', ')
    )(reqBody)
    , params: fp.values(reqBody)
  };
}

function getWhereClause(query) {
  return {
    where: fp.flow(
      fp.keys
      , fp.map(col => col + ' = ?')
      , fp.join(' AND ')
    )(query)
    , params: fp.values(query)
  };
}


//---------//
// Exports //
//---------//

module.exports = handleHead;
