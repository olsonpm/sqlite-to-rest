'use strict';


//---------//
// Imports //
//---------//

const deepFreezeStrict = require('deep-freeze-strict')
  , fp = require('lodash/fp')
  ;


//------//
// Init //
//------//

let dbSchemaObj;


//------//
// Main //
//------//

const getDbSchema = () => dbSchemaObj;

function setDbSchema({ tables, views }) {
  if (arguments.length !== 1) {
    throw new Error("Invalid Input: This function requires exactly "
      + "one argument");
  }

  const aDbSchemaObj = fp.cloneDeep({ tables, views });

  // no errors - good to go

  aDbSchemaObj.tablesAndViews = fp.assign(tables, views);
  dbSchemaObj = deepFreezeStrict(aDbSchemaObj);

  return dbSchemaObj;
}


//---------//
// Exports //
//---------//

module.exports = {
  get: getDbSchema
  , set: setDbSchema
};
