// Copyright 2017 Palantir Technologies Inc.

require('colors');
const _ = require('lodash');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');

const { getPackages } = require('./packages');

function symlink(symlinkContent, symlinkPath) {
  mkdirp.sync(path.dirname(symlinkPath));
  let stats;
  try {
    stats = fs.lstatSync(symlinkPath);
  } catch (e) {}
  if (stats && stats.isSymbolicLink()) {
    fs.unlinkSync(symlinkPath);
  }
  fs.symlinkSync(symlinkContent, symlinkPath);
}

function linkAllPackagesToEachOther(packageDirectory) {
  const packages = getPackages(packageDirectory);

  _.forEach(packages, (package, packageName) => {
    package.localDependencies.forEach(dependencyName => {
      const dependency = packages[dependencyName];
      const symlinkPath = path.resolve(package.path, 'node_modules', dependencyName);
      const symlinkDirectory = path.dirname(symlinkPath);
      symlink(path.resolve(packageDirectory, dependency.path), symlinkPath);

      if (dependency.bin) {
        const binaryRoot = path.resolve(package.path, 'node_modules', '.bin');
        _.forEach(dependency.bin, (relativeBinaryPath, binaryName) => {
          const binarySymlinkPath = path.resolve(binaryRoot, binaryName);
          symlink(path.resolve(dependency.path, relativeBinaryPath), binarySymlinkPath);
        });
      }
    });
  });

  return _.size(packages);
}


function prelink(packageDirectory) {
  const packageCount = linkAllPackagesToEachOther(packageDirectory);
  console.error(`yerna: linking all ${packageCount.toString().cyan} package(s) before running tasks`);
}

function postlink(packageDirectory) {
  const packageCount = linkAllPackagesToEachOther(packageDirectory);
  console.error(`yerna: re-linking all ${packageCount.toString().cyan} package(s) after running tasks`);
}

module.exports = {
  prelink,
  postlink,
  linkAllPackagesToEachOther
};