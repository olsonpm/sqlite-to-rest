'use strict'

//---------//
// Imports //
//---------//

const common = require('./common'),
  errIds = require('./err-ids'),
  fp = require('lodash/fp'),
  handleUpdate = require('./handle-update'),
  utils = require('../../../utils')

//------//
// Init //
//------//

const { bRunQuery, attachError, hasFlag } = common,
  rbErrIds = errIds.post.requestBody

//------//
// Main //
//------//

const buildPost = (name, columns, connections, router) => {
  const insertRow = 'INSERT INTO ' + name

  router.post('/' + name, (ctx, next) => {
    if (ctx.decodedQuerystring) {
      return handleUpdate(ctx, next, name, columns, connections)
    }

    const reqBody = ctx.request.body,
      err = getRequestBodyError(reqBody, columns)

    if (err) {
      return attachError(ctx, err)
    }

    let query = getInsertQuery(reqBody, insertRow),
      params = fp.values(reqBody),
      where

    return bRunQuery(connections.readWrite, query, params)
      .then(res => {
        ctx.status = 201
        query = `SELECT * FROM ${name} WHERE `
        if (res.lastID) {
          query += `rowid = ${res.lastID}`
          params = []
        } else {
          // if lastID is falsey, then that means we have a without rowid table
          ;({ where, params } = getPostInsertWhere(columns, reqBody))
          query += where
        }

        return connections.readOnly.getAsync(query, params)
      })
      .then(row => {
        ctx.body = row
        const pkProps = fp.flow(
          fp.values,
          fp.filter(hasFlag('isPrimaryKey')),
          fp.map('name')
        )(columns)

        const locationQuery = fp.flow(
          fp.pick(pkProps),
          fp.toPairs,
          fp.map(keyVal => keyVal.join('=')),
          fp.join('&')
        )(row)

        ctx.set('location', `/${name}?` + locationQuery)
        return next()
      })
      .catch(err => {
        ctx.status = 500
        console.error(err)
      })
  })
}

//-------------//
// Helper Fxns //
//-------------//

function getRequestBodyError(reqBody, columns) {
  const columnNames = fp.keys(columns),
    requiredColumns = getRequiredColumns(columnNames, columns),
    requestedColumns = fp.keys(reqBody),
    parseErr = 'Error while parsing request body: '

  const invalidColumns = fp.without(columnNames, requestedColumns)
  if (fp.size(invalidColumns)) {
    return {
      msg:
        parseErr +
        'Invalid columns passed.\n' +
        'invalid columns: ' +
        invalidColumns.join(', ') +
        '\navailable columns: ' +
        columnNames.join(', '),
      id: rbErrIds.invalidColumns,
    }
  }

  const requiredColumnsMissing = fp.without(requestedColumns, requiredColumns)
  if (fp.size(requiredColumnsMissing)) {
    return {
      msg:
        parseErr +
        'All non-nullable and non INTEGER PRIMARY KEY columns ' +
        'must be passed.\n' +
        'missing columns: ' +
        requiredColumnsMissing.join(', ') +
        '\npost request body: ' +
        utils.jstring(reqBody),
      id: rbErrIds.missingRequiredColumns,
    }
  }
}

function getPostInsertWhere(columns, reqBody) {
  const pkReqProperties = fp.pick(getPrimaryKeyColumns(columns), reqBody)

  const params = fp.flow(
    fp.values,
    fp.flatten
  )(pkReqProperties)

  const where = fp.flow(
    fp.keys,
    fp.map(col => col + ' =  ?'),
    fp.join(' AND ')
  )(pkReqProperties)

  return {
    where: where,
    params: params,
  }
}

function getPrimaryKeyColumns(columns) {
  return fp.flow(
    fp.pickBy(hasFlag('isPrimaryKey')),
    fp.get('name')
  )(columns)
}

function getRequiredColumns(columnNames, columns) {
  const isNullable = cname => fp.includes('isNullable', columns[cname].flags)
  const isIntegerPk = cname => {
    return (
      fp.includes('isPrimaryKey', columns[cname].flags) &&
      fp.getOr('', cname + '.type', columns).toLowerCase() === 'integer'
    )
  }

  return fp.reject(fp.anyPass([isNullable, isIntegerPk]), columnNames)
}

function getInsertQuery(reqBody, queryStart) {
  let res = queryStart
  const cols = fp.keys(reqBody)
  if (fp.size(reqBody)) {
    res +=
      ' (' +
      cols.join(', ') +
      ') VALUES (' +
      fp.map(fp.constant('?'), cols).join(', ') +
      ')'
  } else {
    res += ' DEFAULT VALUES'
  }

  return res
}

//---------//
// Exports //
//---------//

module.exports = buildPost
