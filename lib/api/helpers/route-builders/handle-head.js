'use strict';


//---------//
// Imports //
//---------//

const bPromise = require('bluebird')
  , common = require('./common')
  , fp = require('lodash/fp')
  ;


//------//
// Init //
//------//

const getQuery = common.getQuery
  , getParams = common.getParams
  ;


//------//
// Main //
//------//

const handleHead = (ctx, next, tableConfig, connections, columnNames, parsed, name) => {
  ctx.set({
    'accept-ranges': 'rows'
    , 'accept-order': columnNames.join(',')
  });
  let bRes = bPromise.resolve();

  if (tableConfig.maxRange) {
    ctx.set('max-range', tableConfig.maxRange);
  }

  if (fp.contains('sendContentRangeInHEAD', tableConfig.flags)) {
    const selectCount = 'SELECT COUNT(*) as count FROM ' + name
      , query = getQuery({ parsed: parsed, queryStart: selectCount })
      , params = getParams(parsed)
      ;

    bRes = bRes.then(() => {
        return connections.readOnly.getAsync(query, params);
      })
      .then(res => {
        ctx.set('content-range', 'rows */' + res.count);
      });
  }
  return bRes.then(() => {
    ctx.status = 200;
    return next();
  });
};


//---------//
// Exports //
//---------//

module.exports = handleHead;
