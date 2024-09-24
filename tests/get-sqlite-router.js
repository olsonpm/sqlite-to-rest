'use strict'

//---------//
// Imports //
//---------//

const bPromise = require('bluebird'),
  bFs = bPromise.promisifyAll(require('fs')),
  chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  chaiSubset = require('chai-subset'),
  common = require('./helpers/common'),
  del = require('del'),
  errIds = require('../lib/api/helpers/route-builders/err-ids'),
  expected = require('./expected/get-sqlite-router'),
  filecompare = require('filecompare'),
  fp = require('lodash/fp'),
  fs = require('fs'),
  makeDir = require('make-dir'),
  ncpAsync = bPromise.promisify(require('ncp')),
  path = require('path'),
  rp = require('request-promise'),
  request = require('request'),
  stream = require('stream'),
  utils = require('../lib/utils')

//------//
// Init //
//------//

chai.use(chaiSubset)
chai.use(chaiAsPromised)
chai.should()

const mapValuesWithKey = utils.mapValuesWithKey,
  resourcesDir = path.join(__dirname, 'resources'),
  beerDb = path.join(resourcesDir, 'beer.sqlite3'),
  beerDbBak = path.join(resourcesDir, 'beer.sqlite3.bak'),
  queryStringsShouldResultInErrors = getQueryStringsShouldResultInErrors(),
  bStreamFinished = (aStream) => {
    return new bPromise((resolve, reject) => {
      try {
        stream.finished(aStream, (err) => {
          if (err) reject(err)
          else resolve(aStream)
        })
      } catch (e) {
        reject(e)
      }
    })
  },
  bAreFilesEqual = (fpath1, fpath2) => {
    return new bPromise((resolve, reject) => {
      try {
        filecompare(fpath1, fpath2, (result) => {
          resolve(result)
        })
      } catch (e) {
        reject(e)
      }
    })
  }

//------//
// Main //
//------//

describe('safe', () => {
  describe('router prefix', () => {
    let rpt

    before(() => {
      const configOverrides = { prefix: '/api' }

      return common.startServer({ configOverrides }).then(
        (port) =>
          (rpt = getRequestPromiseTransformed({
            uri: 'api/beer',
            port: port,
          }))
      )
    })
    after(() => common.stopServer())

    const exp = expected.get

    it('should return the first five rows', async () => {
      await rpt({
        headers: { range: 'rows=0-4' },
      }).should.eventually.containSubset(exp.firstFiveRows)
    })

    it('should return a 400', async () => {
      await rpt({
        uri: 'beer',
        headers: { range: 'rows=0-4' },
      }).should.eventually.have.property('statusCode', 404)
    })
  })

  describe('head', () => {
    let rpt

    before(() =>
      common
        .startServer()
        .then(
          (port) =>
            (rpt = getRequestPromiseTransformed({ method: 'HEAD', port: port }))
        )
    )
    after(() => common.stopServer())

    const exp = expected.head

    it('should return the expected successful responses', async () => {
      await bPromise.all([
        rpt({ uri: 'beer' }).should.eventually.containSubset(exp.beer),
        rpt({ uri: 'brewery' }).should.eventually.containSubset(exp.brewery),
      ])
    })
  })

  describe('get', () => {
    let rpt

    before(() =>
      common
        .startServer()
        .then(
          (port) =>
            (rpt = getRequestPromiseTransformed({ uri: 'beer', port: port }))
        )
    )
    after(() => common.stopServer())

    const qsErrIds = errIds.get.queryString,
      exp = expected.get
    it('should return the expected successful beer range and order responses', async () => {
      // should cover all supported rows syntax variations
      await bPromise.all([
        rpt({ headers: { range: 'rows=0-4' } }).should.eventually.containSubset(
          exp.firstFiveRows
        ),

        rpt({
          qss: 'name_NOTNULL',
          headers: {
            range: 'rows=0-4',
            order: 'name',
          },
        }).should.eventually.containSubset(exp.firstFiveRowsByNameAsc),

        rpt({
          qss: 'name_NOTNULL',
          headers: {
            range: 'rows=0-4',
            order: 'name desc',
          },
        }).should.eventually.containSubset(exp.firstFiveRowsByNameDesc),

        rpt({ headers: { range: 'rows=0-' } }).should.eventually.containSubset(
          exp.firstFiveRows
        ),

        rpt({ headers: { range: 'rows=-5' } }).should.eventually.containSubset(
          exp.lastFiveRows
        ),
      ])
    })

    it('should return the expected successful beer query responses', async () => {
      // should cover all query operators
      await bPromise.all([
        rpt({ qss: 'id=1' }).should.eventually.containSubset(exp.firstRow),

        rpt({ qss: 'id!=1&id<=5' }).should.eventually.containSubset(
          exp.latterFourRows
        ),

        rpt({ qss: 'id>1&id<=5' }).should.eventually.containSubset(
          exp.latterFourRows
        ),

        rpt({ qss: 'id>=2&id<6' }).should.eventually.containSubset(
          exp.latterFourRows
        ),

        rpt({ qss: 'name_ISNULL' }).should.eventually.containSubset(
          exp.nullName
        ),

        rpt({
          qss: "description_LIKE'%Belgian%'&name_NOTNULL",
        }).should.eventually.containSubset(exp.namedBelgians),
      ])
    })

    it('should return the correct error responses', async () => {
      // should cover all errors found in err-ids -> get
      const getAllBeer = rpt
      await bPromise.all([
        getAllBeer().should.eventually.have.nested.property(
          'body.id',
          errIds.get.invalidRange
        ),

        rpt({
          headers: { order: 'notAColumn' },
        }).should.eventually.have.nested.property(
          'body.id',
          errIds.get.invalidOrder
        ),

        queryStringsShouldResultInErrors(rpt, [
          ['notAColumn', qsErrIds.columnRequired],
          ['id', qsErrIds.operatorRequired],
          ['name_LIKE', qsErrIds.openingQuoteRequired],
          ["name_LIKE'White Rascal", qsErrIds.closingQuoteRequired],
          ['name_NOTNULLid', qsErrIds.ampersandRequired],
        ]),
      ])
    })
  })

  describe('get - big', function () {
    this.timeout(60000)

    const pathToStreamOut = path.join(__dirname, 'tmp/result.json')
    let port

    before(() => {
      const configOverrides = {
        tablesAndViews: {
          beer: {
            maxRange: Infinity,
          },
        },
      }

      const dbPath = path.join(__dirname, 'resources/big.beer.sqlite3')

      return Promise.all([
        common.startServer({ dbPath, configOverrides }),
        makeDir(path.dirname(pathToStreamOut)),
      ]).then(([serverPort]) => {
        port = serverPort
      })
    })
    after(() => Promise.all([common.stopServer(), del(pathToStreamOut)]))

    it('should stream a large response', async () => {
      const writeStream = fs.createWriteStream(pathToStreamOut),
        expectedLargeResult = path.join(
          __dirname,
          'expected/get-sqlite-router/big-result.json'
        ),
        resultStream = request
          .get(`http://localhost:${port}/beer`)
          .on('response', (response) => {
            response.statusCode.should.equal(200)
            response.headers['content-type'].should.equal(
              'application/octet-stream'
            )
            response.headers['content-range'].should.equal(
              'rows 0-100015/100015'
            )
            response.headers['transfer-encoding'].should.equal('chunked')
          })
          .on('error', (err) => {
            console.error(err)
          })
          .pipe(writeStream)

      await bStreamFinished(resultStream).then(() =>
        bAreFilesEqual(pathToStreamOut, expectedLargeResult)
      ).should.eventually.be.true
    })
  })

  describe('Unsupported Methods', () => {
    let rpt

    before(() =>
      common.startServer().then(
        (port) =>
          (rpt = getRequestPromiseTransformed({
            method: 'PATCH',
            port: port,
          }))
      )
    )
    after(() => common.stopServer())

    const exp = expected.unsupported

    it('should return the correct 405 responses', async () => {
      await bPromise.all([
        rpt({ uri: 'beer_per_brewery' }).should.eventually.containSubset(
          exp.beer_per_brewery
        ),
        rpt({ uri: 'beer' }).should.eventually.containSubset(exp.beer),
      ])
    })
  })
})

describe('unsafe', () => {
  afterEach(() =>
    bPromise.all([bFs.renameAsync(beerDbBak, beerDb), common.stopServer()])
  )

  describe('delete', () => {
    let rpt

    beforeEach(() =>
      bPromise
        .props({
          unused: ncpAsync(beerDb, beerDbBak),
          port: common.startServer(),
        })
        .then(
          ({ port }) =>
            (rpt = getRequestPromiseTransformed({
              uri: 'city',
              method: 'DELETE',
              port: port,
            }))
        )
    )

    const qsErrIds = errIds.delete.queryString,
      exp = expected.delete
    it('should return the expected successful beer responses', async () => {
      await rpt({
        qss: 'state=WI&city_name=Milwaukee',
      }).should.eventually.containSubset(exp.success)
    })

    it('should return 404 on non-existent resource', async () => {
      await rpt({
        qss: 'state=WI&city_name=Eau Claire',
      }).should.eventually.have.property('statusCode', 404)
    })

    it('should return the correct error responses', async () => {
      // should cover all errors found in err-ids -> delete

      await queryStringsShouldResultInErrors(rpt, [
        ['state=CO&state=CO', qsErrIds.duplicatePkColumnsNotAllowed],
        ['state>CO', qsErrIds.equalsRequired],
        ['state=CO', qsErrIds.missingPkColumns],
        ['notAColumn', qsErrIds.pkColumnRequired],
      ])
    })
  })

  describe('insert', () => {
    let rpt

    beforeEach(() =>
      bPromise
        .props({
          unused: ncpAsync(beerDb, beerDbBak),
          port: common.startServer(),
        })
        .then(
          ({ port }) =>
            (rpt = getRequestPromiseTransformed({
              uri: 'city',
              method: 'POST',
              port: port,
            }))
        )
    )

    const rbErrIds = errIds.post.requestBody,
      exp = expected.post
    it('should return the expected successful beer responses', async () => {
      await rpt({
        body: exp.eauClaireSuccess.body,
      }).should.eventually.containSubset(exp.eauClaireSuccess)
    })

    it('should return the correct error responses', async () => {
      // should cover all errors found in err-ids -> post

      await bPromise.all([
        rpt({
          body: { notAColumn: 'error' },
        }).should.eventually.have.nested.property(
          'body.id',
          rbErrIds.invalidColumns
        ),

        rpt({ body: { state: 'WI' } }).should.eventually.have.nested.property(
          'body.id',
          rbErrIds.missingRequiredColumns
        ),
      ])
    })
  })

  describe('update', () => {
    let rptb, rptc

    beforeEach(() =>
      bPromise
        .props({
          unused: ncpAsync(beerDb, beerDbBak),
          port: common.startServer(),
        })
        .then(({ port }) => {
          rptb = getRequestPromiseTransformed({
            qs: { id: 5 },
            uri: 'beer',
            method: 'POST',
            port: port,
          })
          rptc = getRequestPromiseTransformed({
            uri: 'city',
            method: 'POST',
            port: port,
          })
        })
    )

    const rbErrIds = errIds.update.requestBody,
      qsErrIds = errIds.update.queryString,
      exp = expected.post_update
    it('should return the expected successful beer responses', async () => {
      await rptb({
        body: fp.pick('description', exp.thaiSuccess.body),
      }).should.eventually.containSubset(exp.thaiSuccess)
    })

    it('should return the correct error responses', async () => {
      // should cover all errors found in err-ids -> update

      await bPromise.all([
        rptb({
          body: { notAColumn: 'error' },
        }).should.eventually.have.nested.property(
          'body.id',
          rbErrIds.invalidColumns
        ),

        rptb().should.eventually.have.nested.property(
          'body.id',
          rbErrIds.mustBeNonEmpty
        ),

        queryStringsShouldResultInErrors(rptc, [
          ['state=CO&state=CO', qsErrIds.duplicatePkColumnsNotAllowed],
          ['state>CO', qsErrIds.equalsRequired],
          ['state=CO', qsErrIds.missingPkColumns],
          ['notAColumn', qsErrIds.pkColumnRequired],
        ]),
      ])
    })
  })
})

//-------------//
// Helper Fxns //
//-------------//

const omitDateHeader = mapValuesWithKey((val, key) => {
  return key === 'headers' ? fp.omit('date', val) : val
})

const getResponse = (full) => {
  return fp.has('response.toJSON', full)
    ? full.response.toJSON()
    : fp.invoke('toJSON', full) || full
}

const cleanFullResponse = fp.flow(
  getResponse,
  fp.omit('request'),
  fp.omitBy(fp.isUndefined),
  omitDateHeader
)

const allowHttpErrors = (err) => {
  if (err.statusCode) return err
  throw err
}

function getRequestPromiseTransformed(defaultOpts) {
  return (opts) =>
    rp(getOptions(fp.assign(defaultOpts, opts)))
      .catch(allowHttpErrors)
      .then(cleanFullResponse)
}

function getOptions(argsObj) {
  let { qss } = argsObj

  const { port, qs, uri } = argsObj

  if (qss && qs) throw new Error('qs && qss cannot both be defined')

  qss = qss ? '?' + encodeURIComponent(qss) : ''
  return fp.assign(
    {
      uri: `http://localhost:${port}/${uri}${qss}`,
      json: true,
      resolveWithFullResponse: true,
    },
    fp.omit(['uri', 'qss'], argsObj)
  )
}

function getQueryStringsShouldResultInErrors() {
  return fp.curry(async (rpt, pairArr) => {
    await bPromise.all(fp.map(fp.spread(testQs), pairArr))

    // scoped helper fxns
    async function testQs(qss, anErrId) {
      await rpt({ qss: qss }).should.eventually.have.nested.property(
        'body.id',
        anErrId
      )
    }
  })
}
