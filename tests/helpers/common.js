'use strict';


//---------//
// Imports //
//---------//

const bPromise = require('bluebird')
  , Koa = require('koa')
  , koaBodyparser = require('koa-bodyparser')
  , path = require('path')
  , portfinder = require('portfinder')
  , sqliteToRest = require('../../lib')
  ;


//------//
// Init //
//------//

const dbPath = path.resolve(
    path.join(__dirname, '../resources/beer.sqlite3')
  )
  , getSqliteRouter = sqliteToRest.getSqliteRouter
  , getPortAsync = bPromise.promisify(portfinder.getPort)
  ;

let server;


//------//
// Main //
//------//

const startServer = sqliteToRestConfig => {
  const app = new Koa();
  app.use(koaBodyparser());

  return bPromise.props({
      router: getSqliteRouter({
          dbPath: dbPath
          , config: sqliteToRestConfig
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

const restartServer = sqliteToRestConfig => {
  stopServer();
  startServer(sqliteToRestConfig);
};


//---------//
// Exports //
//---------//

module.exports = {
  restartServer: restartServer
  , startServer: startServer
  , stopServer: stopServer
};
