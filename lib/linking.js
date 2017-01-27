// Copyright 2017 Palantir Technologies Inc.

const _ = require('lodash');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');

function symlink(symlinkContent, symlinkPath) {
  mkdirp.sync(path.dirname(symlinkPath));
  let stats;
  try {
    stats = fs.lstatSync(symlinkPath);
  } catch (e) {}
  if (stats) {
    fs.unlinkSync(symlinkPath);
  }
  fs.symlinkSync(symlinkContent, symlinkPath);
}

function linkPackages(packagesByName) {
  _.forEach(packagesByName, (pkg, packageName) => {
    pkg.localDependencies.forEach(dependencyName => {
      const dependency = packagesByName[dependencyName];
      const symlinkPath = path.resolve(pkg.path, 'node_modules', dependencyName);
      const symlinkDirectory = path.dirname(symlinkPath);
      symlink(dependency.path, symlinkPath);

      if (dependency.bin) {
        const binaryRoot = path.resolve(pkg.path, 'node_modules', '.bin');
        _.forEach(dependency.bin, (relativeBinaryPath, binaryName) => {
          const binarySymlinkPath = path.resolve(binaryRoot, binaryName);
          symlink(path.resolve(dependency.path, relativeBinaryPath), binarySymlinkPath);
        });
      }
    });
  });
}

module.exports = {
  linkPackages
};
