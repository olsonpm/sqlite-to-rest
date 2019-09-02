'use strict'

//---------//
// Imports //
//---------//

const generateSkeleton = require('./commands/generate-skeleton'),
  getSqliteRouter = require('./api/get-sqlite-router')

//---------//
// Exports //
//---------//

module.exports = {
  getSqliteRouter: getSqliteRouter,
  generateSkeleton: generateSkeleton.mFn,
}
