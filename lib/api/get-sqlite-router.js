'use strict';


//---------//
// Imports //
//---------//

const bPromise = require('bluebird')
  , common = require('../common')
  , configService = require('./services/config')
  , dbSchema = require('./services/db-schema')
  , fp = require('lodash/fp')
  , getSchema = require('./helpers/get-schema')
  , koaBodyparser = require('koa-bodyparser')
  , koaDecodedQuerystring = require('koa-decoded-querystring')
  , KoaRouter = require('koa-router')
  , madonnaFn = require('madonna-function')
  , requireDir = require('require-dir')
  , sqlite3 = require('sqlite3')
  , utils = require('../utils')
  ;


//------//
// Init //
//------//

bPromise.promisifyAll(sqlite3.Database.prototype);

const createMadonnaFunction = madonnaFn.create
  , forEachWithKey = utils.forEachWithKey
  , isSqliteFileSync = common.isSqliteFileSync
  , routeBuilders = requireDir('./helpers/route-builders', { recurse: true })
  ;


//------//
// Main //
//------//

const mGetSqliteRouter = createMadonnaFunction({
  marg: {
    schema: {
      dbPath: {
        flags: ['require']
        , custom: { isSqlitePath: isSqliteFileSync }
      }
      , config: ['isLadenPlainObject']
      , onConnectionCallback: ['isFunction']
    }
  }
  , fn: getSqliteRouter
});

function getSqliteRouter({ dbPath, config = {}, onConnectionCallback = (db) => {} }) {
  return getSchema(dbPath)
    .then(schema => {
      dbSchema.set(schema);
      configService.set(config);

      const router = new KoaRouter({ prefix: configService.get().prefix });

      router.use(koaBodyparser())
        .use(koaDecodedQuerystring());

      return bPromise.props({
        readOnly: bGetConnection(dbPath, sqlite3.OPEN_READONLY, onConnectionCallback)
        , readWrite: bGetConnection(dbPath, sqlite3.OPEN_READWRITE, onConnectionCallback)
        , router: router
      });
    })
    .then(({ readOnly, readWrite, router }) => {
      const connections = {
          readOnly: readOnly
          , readWrite: readWrite
        }
        , structTypes = {
          table: {
            tabularItem: dbSchema.get().tables
            , methods: ['get', 'post', 'delete']
          }
          , view: {
            tabularItem: dbSchema.get().views
            , methods: ['get']
          }
        };

      // a whole bunch of routing side effects happen here!
      fp.each(getBuildRoutes(router, connections), structTypes);

      return router;
    });
}


//-------------//
// Helper Fxns //
//-------------//

function getBuildRoutes(router, connections) {
  return aStructType => {
    forEachWithKey((columns, name) => {
      fp.each(aTableMethod => {
        columns = fp.keyBy('name', columns);
        routeBuilders[aTableMethod](name, columns, connections, router);
      }, aStructType.methods);
    }, aStructType.tabularItem);
  };
}

function bGetConnection(dbPath, mode, onConnectionCallback) {
  return new bPromise((resolve, reject) => {
    const db = new sqlite3.Database(
      dbPath
      , mode
      , err => {
        onConnectionCallback(db)
        return (err) ? reject(err) : resolve(db)
      }
    );
  });
}


//---------//
// Exports //
//---------//

module.exports = mGetSqliteRouter;
