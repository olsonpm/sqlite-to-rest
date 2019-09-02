'use strict';


//---------//
// Imports //
//---------//

const bPromise = require('bluebird')
  , fp = require('lodash/fp')
  , Koa = require('koa')
  , koaBodyparser = require('koa-bodyparser')
  , path = require('path')
  , portfinder = require('portfinder')
  , sqliteToRest = require('../../lib')
  , sqliteToRestConfig = require('../resources/sqlite-to-rest-config')
  ;


//------//
// Init //
//------//

const defaultDbPath = path.resolve(
    path.join(__dirname, '../resources/beer.sqlite3')
  )
  , getSqliteRouter = sqliteToRest.getSqliteRouter
  , getPortAsync = bPromise.promisify(portfinder.getPort)
  ;

let server;


//------//
// Main //
//------//

const startServer = (
  {
    dbPath = defaultDbPath
    , configOverrides = {}
  } = {}
) => {
  const app = new Koa();
  app.use(koaBodyparser());

  return bPromise.props({
      router: getSqliteRouter({
          dbPath: dbPath
          , config: fp.assign(sqliteToRestConfig, configOverrides)
        })
      , port: getPortAsync()
    })
    .then(
      ({router, port}) => bPromise.fromCallback(
          cb => {
            server = app.use(router.routes())
              .use(router.allowedMethods())
              .listen(port, cb);
          }
        ).thenReturn(port)
    );
};

const stopServer = () => bPromise.fromCallback(cb => server.close(cb));


//---------//
// Exports //
//---------//

module.exports = {
  startServer: startServer
  , stopServer: stopServer
};
