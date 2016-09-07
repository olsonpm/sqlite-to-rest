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
    attachError, bRunQuery, getQuery
    , getParams, getPkColumnNames, parseQueryForPkColumns
  } = common
  , qsErrIds = errIds.delete.queryString
  ;


//------//
// Main //
//------//

const buildDelete = (name, columns, connections, router) => {
  const deleteRow = 'DELETE FROM ' + name
    , pkColumnNames = getPkColumnNames(columns);

  router.delete('/' + name, (ctx, next) => {

    const parsed = parseQueryForPkColumns(ctx.decodedQuerystring, pkColumnNames, qsErrIds);

    if (fp.invoke('hasErr', parsed)) {
      return attachError(ctx, parsed);
    }

    const query = getQuery({ parsed: parsed, queryStart: deleteRow })
      , params = getParams(parsed)
      ;

    return bRunQuery(connections.readWrite, query, params)
      .then((res) => {
        const { changes } = res;
        ctx.status = (changes)
          ? 204
          : 400;
        return next();
      })
      .catch(err => {
        ctx.status = 500;
        console.error(err);
      });
  });
};


//---------//
// Exports //
//---------//

module.exports = buildDelete;
