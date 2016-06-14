'use strict';


//---------//
// Imports //
//---------//

const Koa = require('koa')
  , sqliteToRest = require('sqlite-to-rest');


//------//
// Init //
//------//

const dbPath = '<%= dbPath %>'
  , getSqliteRouter = sqliteToRest.getSqliteRouter
  , PORT = 8085;


//------//
// Main //
//------//

const app = new Koa();

getSqliteRouter({ dbPath })
  .then(router => {
    app.use(router.routes())
      .use(router.allowedMethods())
      .listen(PORT);

    console.log(`Listening on port: ${PORT}`);
  });
