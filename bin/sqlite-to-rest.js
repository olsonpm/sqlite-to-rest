#! /usr/bin/env node
'use strict';


//---------//
// Imports //
//---------//

const createOpinionatedCli = require('create-opinionated-cli')
  , fp = require('lodash/fp')
  , requireDir = require('require-dir')
  , state = require('../lib/services/state')
  ;


//------//
// Init //
//------//

state.setIsCli(true);


//------//
// Main //
//------//

createOpinionatedCli({
  description: "A collection of tools exposing the sqlite-to-rest functionality"
    + " via cli.  All commands here are also exposed on the required object."
  , commands: fp.values(requireDir('../cli/commands'))
});
