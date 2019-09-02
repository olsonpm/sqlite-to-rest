'use strict'

//---------//
// Imports //
//---------//

const bPromise = require('bluebird'),
  bFs = bPromise.promisifyAll(require('fs')),
  child_process = require('child_process'),
  common = require('../common'),
  fp = require('lodash/fp'),
  madonnaFunction = require('madonna-function'),
  path = require('path'),
  utils = require('../utils')

//------//
// Init //
//------//

const cliLog = utils.cliLog,
  createMadonnaFn = madonnaFunction.create,
  execAsync = bPromise.promisify(child_process.exec),
  isSqliteFileSync = common.isSqliteFileSync,
  marg = getGenerateSkeletonMarg()

//------//
// Main //
//------//

const mGenerateSkeleton = createMadonnaFn({
  marg: marg,
  fn: generateSkeleton,
})

function generateSkeleton({ dir, dbPath }) {
  const installDeps = hasFileInDirectory('package.json', dir)
    .then(function(hasPJson) {
      if (hasPJson) {
        cliLog('package.json found in working directory.')
      } else {
        cliLog(
          'package.json not found in working directory.  Running `npm init -f`.'
        )
        return execAsync('npm init -f', { cwd: dir })
      }
    })
    .then(function() {
      cliLog('Installing dependencies')
      return execAsync('npm i --save koa@^2 olsonpm/sqlite-to-rest', {
        cwd: dir,
      })
    })

  const writeTpl = bPromise
    .props({
      tpl: bFs.readFileAsync(
        path.join(__dirname, 'resources/skeleton.tpl'),
        'utf8'
      ),
      skeletonFName: getSkeletonFName(dir),
    })
    .then(({ tpl, skeletonFName }) => {
      // deactivates es6 delimiter
      // https://github.com/lodash/lodash/issues/399
      fp.templateSettings.interpolate = /<%=([\s\S]+?)%>/g

      const contents = fp.template(tpl)({ dbPath })
      cliLog('Writing the skeleton server to: ' + skeletonFName)
      return bFs.writeFileAsync(path.join(dir, skeletonFName), contents)
    })

  return bPromise.all([writeTpl, installDeps]).then(() => {
    cliLog('Finished!')
  })
}

//-------------//
// Helper Fxns //
//-------------//

function getGenerateSkeletonMarg() {
  return {
    dir: {
      custom: { isDirectory: common.isDirectorySync },
    },
    dbPath: {
      flags: ['require'],
      custom: { isFile: isSqliteFileSync },
    },
  }
}

function hasFileInDirectory(fname, dir) {
  return bFs.readdirAsync(dir).then(fp.includes(fname))
}

function getSkeletonFName(dir) {
  return bFs.readdirAsync(dir).then(fileNames => {
    if (!fp.includes('skeleton.js', fileNames)) return 'skeleton.js'
    else return getNextSkeletonFName({ fileNames })
  })
}

function getNextSkeletonFName({ fileNames, i = 1 }) {
  const fname = 'skeleton.' + i + '.js'
  if (!fp.includes(fname, fileNames)) return fname
  else return getNextSkeletonFName({ fileNames, i: i + 1 })
}

//---------//
// Exports //
//---------//

module.exports = {
  fn: generateSkeleton,
  mFn: mGenerateSkeleton,
  marg: marg,
}
