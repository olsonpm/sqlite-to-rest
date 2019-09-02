'use strict'

//---------//
// Imports //
//---------//

const deepFreezeStrict = require('deep-freeze-strict'),
  dbSchema = require('./db-schema'),
  fp = require('lodash/fp'),
  madonna = require('madonna-fp/es6'),
  utils = require('../../utils')

//------//
// Init //
//------//

let configObj

const { reduceWithKeyAndObj } = utils

//------//
// Main //
//------//

function setConfig(aConfigObj) {
  const dbSchemaObj = dbSchema.get()

  if (arguments.length !== 1) {
    throw new Error(
      'Invalid Input: This function requires exactly ' + 'one argument'
    )
  }
  validateConfig(aConfigObj, dbSchemaObj)

  // no errors - good to go
  const appConfigDefaults = getApplicationConfigDefaults(dbSchemaObj)

  // First we merge the passed config over the app defaults
  // Then we merge each table and view over the
  //   'allTablesAndViews' configuration
  // Finally we add the previously lost opts property
  const prefix = aConfigObj.prefix || ''
  aConfigObj = fp.omit('prefix', aConfigObj)
  const mergedTablesAndViews = fp.flow(
    fp.mergeWith(configCustomizer, appConfigDefaults),
    reduceWithKeyAndObj(mergeEachTableAndView, {})
  )(aConfigObj)

  configObj = {
    opts: aConfigObj.opts,
    tablesAndViews: mergedTablesAndViews,
  }
  if (prefix) configObj.prefix = prefix

  configObj = deepFreezeStrict(configObj)

  return configObj
}

const getConfig = () => configObj

//-------------//
// Helper Fxns //
//-------------//

function getVConfig(dbSchemaObj) {
  return madonna.createValidator({
    schema: getConfigSchema(dbSchemaObj),
    opts: { name: 'vConfig' },
  })
}

const vItem = getVItem()

function mergeEachTableAndView(res, val, key, obj) {
  switch (key) {
    case 'allTablesAndViews':
      return res
    case 'tablesAndViews':
      return fp.mapValues(
        fp.mergeWith(configCustomizer, obj.allTablesAndViews),
        val
      )
    default:
      return fp.assign(res, val)
  }
}

function getConfigSchema(dbSchemaObj) {
  const vTablesAndViews = getVTablesAndViews(dbSchemaObj)
  return {
    allTablesAndViews: { passTo: vItem },
    tablesAndViews: { passTo: vTablesAndViews },
    prefix: ['isLadenString'],
  }
}

function validateConfig(dirtyObj, dbSchemaObj) {
  return madonna.validateSternly(getConfigSchema(dbSchemaObj), dirtyObj)
}

function getVTablesAndViews(dbSchemaObj) {
  const tablesAndViewsMarg = fp.flow(
    fp.assign(dbSchemaObj.views),
    fp.mapValues(() => ({ passTo: vItem }))
  )(dbSchemaObj.tables)

  return madonna.createSternValidator({
    schema: tablesAndViewsMarg,
    opts: {
      name: 'vTablesAndViews',
    },
  })
}

function getVItem() {
  return madonna.createSternValidator({
    schema: {
      maxRange: ['isPositiveNumber'],
      flags: {
        allContainedIn: ['sendContentRangeInHEAD'],
      },
    },
    opts: {
      name: 'vItem',
    },
  })
}

function getApplicationConfigDefaults(dbSchemaObj) {
  const emptyObjPerTable = fp.mapValues(() => ({}), dbSchemaObj.tablesAndViews)

  return {
    allTablesAndViews: {
      maxRange: 1000,
    },
    tablesAndViews: emptyObjPerTable,
  }
}

function configCustomizer(objVal, srcVal) {
  if (fp.isArray(objVal)) {
    // src will also be an array then
    let res = fp.union(objVal, srcVal)
    const removeThese = fp.flow(
      fp.filter(fp.startsWith('-')),
      fp.map(str => str.slice(1))
    )(res)

    res = fp.flow(
      fp.reject(fp.startsWith('-')),
      fp.without(fp, removeThese),
      fp.sortBy(fp.identity)
    )(res)

    return res
  }
}

//---------//
// Exports //
//---------//

module.exports = {
  get: getConfig,
  set: setConfig,
  getVConfig: getVConfig,
}
