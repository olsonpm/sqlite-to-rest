'use strict';


//---------//
// Imports //
//---------//

const common = require('../../lib/common')
  , generateSkeleton = require('../../lib/commands/generate-skeleton')
  ;


//------//
// Init //
//------//

const isSqliteFileSync = common.isSqliteFileSync;


//------//
// Main //
//------//

const command = {
  name: 'generate-skeleton'
  , fn: callGenerateSkeleton
  , desc: "Creates a bare-minimum koa server in your working directory."
  , marg: {
    dbPath: {
      flags: ['require']
      , custom: { isFile: isSqliteFileSync }
    }
  }
  , args: [{
    name: 'dbPath'
    , desc: "Path to sqlite database required to create the routing"
      + " and validation"
    , example: '<a file path>'
    , flags: ['require']
    , type: 'string'
  }]
};


//-------------//
// Helper Fxns //
//-------------//

function callGenerateSkeleton({ dbPath }) {
  return generateSkeleton.fn({
    dbPath
    , dir: process.cwd()
  });
}


//---------//
// Exports //
//---------//

module.exports = command;
