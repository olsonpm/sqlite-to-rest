'use strict'

//---------//
// Imports //
//---------//

const bPromise = require('bluebird'),
  common = require('./common'),
  config = require('../../services/config'),
  errIds = require('./err-ids'),
  fp = require('lodash/fp'),
  handleHead = require('./handle-head'),
  jsonStream = require('JSONStream'),
  madonna = require('madonna-fp/es6'),
  utils = require('../../../utils')

//------//
// Init //
//------//

const {
    appendMidParsed,
    attachError,
    getInvalidOrderElements,
    getParams,
    getQuery,
    quoteNotAdjacentToAnother,
    removeLeading,
  } = common,
  { isDefined, startsWith, takeWhileWithIndexAndArr } = utils,
  outsideE = madonna.CRITERION_FNS.outsideE,
  qsErrIds = errIds.get.queryString

//------//
// Main //
//------//

const buildGet = (name, columns, connections, router) => {
  const columnNames = fp.keys(columns),
    configObj = config.get(),
    selectAll = 'SELECT ' + columnNames.join(', ') + ' FROM ' + name,
    selectCount = 'SELECT COUNT(*) as count FROM ' + name,
    tableConfig = configObj.tablesAndViews[name]
  router.get('/' + name, (ctx, next) => {
    if (ctx.headers.order) {
      const invalidOrderElements = getInvalidOrderElements(
        ctx.headers.order,
        columnNames
      )
      if (fp.size(invalidOrderElements)) {
        return attachError(ctx, {
          msg:
            'Invalid order.  The order header must contain comma-delimited' +
            "  column names each optionally followed by a space and 'asc'" +
            " or 'desc'.  The following comma-separated strings found in" +
            ' order are invalid\n' +
            invalidOrderElements.join('\n'),
          id: errIds.get.invalidOrder,
        })
      }
    }

    const parsed = parseQuery(ctx.decodedQuerystring, columnNames)

    if (fp.invoke('hasErr', parsed)) {
      return attachError(ctx, parsed)
    }
    // query string is good - movin' on

    if (ctx.method === 'HEAD') {
      return handleHead(
        ctx,
        next,
        tableConfig,
        connections,
        columnNames,
        parsed,
        name
      )
    }

    // else method is GET

    // handle the case of no range request header first since it's the easiest
    if (!ctx.headers.range) {
      return handleNoRangeRequest(
        parsed,
        selectAll,
        selectCount,
        connections,
        tableConfig,
        ctx,
        next
      )
    }

    // otherwise a range request header was passed, verify it

    let rangeHeader = ctx.headers.range.replace(/^\s*/g, ''),
      reason

    const rangeIsValid =
        !!rangeHeader.match(/^rows=([0-9]+)?-([0-9]+)?$/) &&
        rangeHeader.replace !== 'rows=-',
      range = {}

    if (!rangeIsValid) {
      reason =
        'Range must have the syntax ' +
        "'rows=<optional number A>-<optional number B>', where either A or B" +
        ' must be specified.'
      return attachRangeNotValid(reason, ctx)
    }

    rangeHeader = rangeHeader.slice(5)
    if (rangeHeader[0] !== '-') {
      range.start = fp.toNumber(rangeHeader.match(/^[0-9]+/)[0])
      if (fp.last(rangeHeader) !== '-') {
        range.end = fp.toNumber(rangeHeader.match(/[0-9]+$/)[0])

        if (range.start === range.end) {
          reason =
            'Range start cannot equal range end.' +
            '\nrange -> start: ' +
            range.start +
            '\nrange -> end: ' +
            range.end
          return attachRangeNotValid(reason, ctx)
        } else if (range.start > range.end) {
          ;[range.start, range.end] = [range.end, range.start]
        }
      }
    }

    // range is valid thus far - woo woo

    let query = getQuery({
      order: ctx.headers.order,
      parsed: parsed,
      queryStart: selectCount,
    })

    const params = getParams(parsed)
    // We must know the size of the result set prior to deciding whether
    //   the range is satisfiable.
    return connections.readOnly
      .getAsync(query, params)
      .then(({ count }) => {
        if (count === 0) {
          ctx.status = 404
          return next()
        }

        // finalize the range object
        if (fp.isUndefined(range.start)) {
          range.start = count - fp.toNumber(rangeHeader.slice(1))
          // need to make sure the outsideE check below doesn't include a
          // negative range
          range.end = fp.max([count - 1, 0])
        }
        if (fp.isUndefined(range.end)) {
          range.end = fp.min([count, range.start + tableConfig.maxRange - 1])
        } else {
          range.end = fp.min([range.end, count - 1])
        }

        if (outsideE([0, count], range.start)) {
          reason =
            range.start < 0
              ? 'Range cannot have a start value of less than zero.\n'
              : 'Range cannot have a start value greater than the result count.\n'

          reason +=
            'parameterized query: ' +
            query +
            '\nparams: ' +
            params.join(', ') +
            '\nrange header: ' +
            ctx.headers.range +
            '\nresult count: ' +
            count +
            '\nrange.start: ' +
            range.start +
            '\nrange.end: ' +
            range.end

          return attachRangeNotValid(reason, ctx)
        } else if (range.end - range.start + 1 > tableConfig.maxRange) {
          ctx.set({
            'max-range': tableConfig.maxRange,
            'content-range': 'rows */' + count,
          })
          reason =
            'The range you requested is too large to send across in one' +
            " response.  See 'max-range' header for the maximum number of" +
            ' rows you may request'
          return attachRangeNotValid(reason, ctx)
        }

        // range is finally valid.  Finish Him!
        query = getQuery({
          limit: range.end - range.start + 1,
          offset: range.start,
          order: ctx.headers.order,
          parsed: parsed,
          queryStart: selectAll,
        })

        const stringifyStream = (ctx.body = jsonStream.stringify()),
          limit = count - 1,
          isPartialResource = range.end - range.start !== limit
        ctx.set(
          'content-range',
          'rows ' + range.start + '-' + fp.min([range.end, limit]) + '/' + limit
        )
        ctx.status = isPartialResource ? 206 : 200

        eachAsync(connections.readOnly, query, params, stringifyStream)
          .catch(err => {
            console.error(err)
          })
          .finally(() => {
            stringifyStream.end()
          })
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

//
// eachAsync concept from here:
// https://gist.github.com/erikman/a494925ae6ce95869dd56076fb810831#file-node-sqlite3-performance-test-js-L87
//
// the idea is that 'each' doesn't provide a stream-friendly interface to
//   querying the database.  By wrapping the query into a statement, we have
//   control over when to ask the database for another row which means we can
//   wait when the stream reaches its max throughput.  This is still not a great
//   solution however because
//
//   1. this is slower than database.prototype.each
//   2. it's unlikely we'll be reaching max throughput by waiting for the
//      database each row
//   3. per sqlite3 docs, this locks the database until the statement
//      is finalized.
//
//   If the drawbacks become a problem then maybe we can expose a separate
//   interface which loops over rows in batches via LIMIT, allowing the client
//   to make the choice between atomicity and performance.
//
function eachAsync(conn, query, params, stringifyStream) {
  return new bPromise((resolve, reject) => {
    try {
      let rowCount = 0

      const stmt = conn.prepare(query, params, err => {
        if (err) {
          return bPromise.reject(err)
        }

        const recursiveGet = (err, row) => {
          if (err) {
            cleanupAndDone(err)
            return
          }

          if (!row) {
            cleanupAndDone()
            return
          }
          rowCount += 1
          const shouldContinue = stringifyStream.write(row)

          if (!shouldContinue) {
            console.log('got here')
            stringifyStream.once('drain', () => {
              console.log('no drain :(')
              stmt.get(recursiveGet)
            })
          } else {
            stmt.get(recursiveGet)
          }
        }

        // Start recursion
        stmt.get(recursiveGet)
      })

      const cleanupAndDone = err => {
        stmt.finalize(() => {
          if (err) reject(err)
          else resolve(rowCount)
        })
      }
    } catch (e) {
      reject(e)
    }
  })
}

function attachRangeNotValid(internalReason, ctx) {
  ctx.status = 416
  ctx.body = "The request 'range' header is invalid.\n" + internalReason + '\n'
}

// Currently there's other data associated with these operators, but not enough
//   to warrant a configuration structure.
const operators = [
  '_LIKE',
  '_ISNULL',
  '_NOTNULL',
  '=',
  '!=',
  '>=',
  '<=',
  '>',
  '<',
]

function parseQuery(str, columnNames) {
  const res = {},
    originalQueryStr = str,
    ampersandErr =
      ' must be followed by an ampersand when not' +
      ' at the end of the query string',
    parseErr = 'Error while parsing query string: '

  while (str.length) {
    let val

    // loop goes through three steps.  Extract column -> operator -> and value
    //   if applicable

    const col = fp.find(startsWith(str), columnNames)
    if (!col) {
      const midParsed = str === originalQueryStr ? '' : '(mid-parsed)'

      return {
        msg:
          parseErr +
          'Column name required.\n' +
          'query string ' +
          midParsed +
          ': ' +
          str +
          '\navailable columns: ' +
          columnNames.join(', '),
        hasErr: fp.constant(true),
        id: qsErrIds.columnRequired,
      }
    }

    str = removeLeading(str, col)
    const op = fp.find(startsWith(str), operators)

    if (!op) {
      return {
        msg:
          parseErr +
          'Operator required.' +
          appendMidParsed(str) +
          '\navailable operators: ' +
          operators.join(', '),
        hasErr: fp.constant(true),
        id: qsErrIds.operatorRequired,
      }
    }

    str = removeLeading(str, op)
    // no values with ISNULL or NOTNULL, so just make sure an ampersand
    //   was passed
    if (fp.includes(op, ['_ISNULL', '_NOTNULL'])) {
      // no values to parse
    } else if (fp.includes(op, ['_LIKE'])) {
      // need to ensure quotes in _LIKE
      if (!startsWith(str, "'")) {
        return {
          msg:
            parseErr +
            'The first character after _LIKE must be a single quote' +
            appendMidParsed(str),
          hasErr: fp.constant(true),
          id: qsErrIds.openingQuoteRequired,
        }
      }
      str = removeLeading(str, "'")

      // perform quote escaping
      val = takeWhileWithIndexAndArr(quoteNotAdjacentToAnother, str).join('')
      if (fp.endsWith(val, str)) {
        return {
          msg:
            parseErr + '_LIKE must have a closing quote' + appendMidParsed(str),
          hasErr: fp.constant(true),
          id: qsErrIds.closingQuoteRequired,
        }
      }

      str = removeLeading(str, val + "'")
    } else {
      // dealing with a binary operator that's not _LIKE
      val = fp.takeWhile(fp.negate(fp.eq('&')), str).join('')
      str = removeLeading(str, val)
    }

    if (str.length) {
      if (str[0] !== '&') {
        return {
          msg: parseErr + op + ampersandErr + appendMidParsed(str),
          hasErr: fp.constant(true),
          id: qsErrIds.ampersandRequired,
        }
      }
      str = removeLeading(str, '&')
    }

    // so far so good - append operator + value to result column
    res[col] = (res[col] || []).concat(
      fp.pickBy(isDefined, {
        op: getOp(op),
        val: val,
      })
    )
  }

  return res
}

const queryStringOpToSqlOp = {
  _ISNULL: 'IS NULL',
  _LIKE: 'LIKE',
  _NOTNULL: 'IS NOT NULL',
}

function getOp(val) {
  return fp.getOr(val, val, queryStringOpToSqlOp)
}

function handleNoRangeRequest(
  parsed,
  selectAll,
  selectCount,
  connections,
  tableConfig,
  ctx,
  next
) {
  let query = getQuery({
    parsed: parsed,
    queryStart: selectCount,
  })

  const params = getParams(parsed)

  return connections.readOnly
    .getAsync(query, params)
    .then(({ count }) => {
      if (count > (tableConfig.maxRange || Infinity)) {
        ctx.set({
          'accept-ranges': 'rows',
          'max-range': tableConfig.maxRange,
          'content-range': 'rows */' + count,
        })

        attachError(ctx, {
          msg:
            "'range' header required.  This resource's content" +
            ' is too large to send across in one response.  See ' +
            " 'max-range' header for the maximum number of rows you" +
            ' may request',
          id: errIds.get.invalidRange,
        })
        return
      } else if (count === 0) {
        ctx.status = 404
        return next()
      }

      query = getQuery({
        order: ctx.headers.order,
        parsed: parsed,
        queryStart: selectAll,
      })

      const stringifyStream = (ctx.body = jsonStream.stringify())

      stringifyStream.on('error', err => {
        console.error(err)
        stringifyStream.end()
      })

      const limit = count - 1
      if (tableConfig.maxRange) {
        ctx.set('content-range', 'rows 0-' + limit + '/' + limit)
      }

      eachAsync(connections.readOnly, query, params, stringifyStream)
        .catch(err => {
          console.error(err)
        })
        .finally(() => {
          stringifyStream.end()
        })
    })
    .catch(err => {
      ctx.status = 500
      console.error(err)
    })
}

//---------//
// Exports //
//---------//

module.exports = buildGet
