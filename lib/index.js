const chalk = require('chalk');
const path = require('path');
const _ = require('lodash');
const child_process = require('child_process');
const fs = require('fs');
const Promise = require('bluebird');

const { getPackagesPath, getPackages } = require('./packages');
const { linkAllPackagesToEachOther } = require('./linking');
const { runYarnWithPackageJsonMangling } = require('./yarn-with-package-json-mangling');
const { logger, deleteLogFile, LoggerWrapper } = require('./logger');
const { createTaskRunner, runPackagesToposorted, abort } = require('./taskrunning');

function findTransitiveDependentsOrDependencies(allPackages, rootPackageName, typeKey) {
  const selectedPackageNames = [];
  let packageQueue = [ allPackages[rootPackageName] ];
  while (packageQueue.length) {
    const currentPackage = packageQueue.shift();
    if (selectedPackageNames.indexOf(currentPackage.name) === -1) {
      selectedPackageNames.push(currentPackage.name);
      packageQueue = packageQueue.concat(currentPackage[typeKey].map(packageName => allPackages[packageName]))
    }
  }
  return selectedPackageNames.map(packageName => allPackages[packageName]);
}

function maybeIncludeDependentsAndDependencies(commander, allPackages, package) {
  let packages = [ package ];

  if (commander.dependents) {
    packages = packages.concat(_.flatMap(packages, pkg => findTransitiveDependentsOrDependencies(allPackages, pkg.name, 'localDependents')));
  }

  if (commander.dependencies) {
    packages = packages.concat(_.flatMap(packages, pkg => findTransitiveDependentsOrDependencies(allPackages, pkg.name, 'localDependencies')));
  }

  return _.uniqBy(packages, 'name');
}

function applyIncludeExclude(package) {
  return (
    (commander.include.length === 0 || commander.include.some(regex => new RegExp(regex).test(package.name))) &&
    (commander.exclude.length === 0 || !commander.exclude.some(regex => new RegExp(regex).test(package.name)))
  );
};

function getSelectedPackages(commander, additionalFilter = () => true) {
  const packagesPath = getPackagesPath();

  if (!fs.existsSync(packagesPath)) {
    throw new Error(`path ${packagesPath} does not exist`);
  }

  const packagesByName = getPackages(packagesPath);
  const selectedPackages = _.chain(packagesByName)
    .values()
    .filter(applyIncludeExclude)
    .flatMap(pkg => maybeIncludeDependentsAndDependencies(packagesByName, pkg))
    .uniqBy('name')
    .sortBy('name')
    .filter(additionalFilter)
    .value();

  return { packagesPath, packagesByName, selectedPackages };
}

function performLink() {
  const startTime = Date.now();
  const packageCount = linkAllPackagesToEachOther(getPackagesPath());
  logger.info(`yerna: linked ${chalk.cyan(packageCount)} local packages`);
  LoggerWrapper.logSuccessTiming(startTime);
}

function performInstall(commander, moreArgs) {
  const yarnArgs = [ 'install' ].concat(moreArgs);
  const { packagesPath, packagesByName, selectedPackages } = getSelectedPackages(commander);
  runPackagesToposorted(
    new LoggerWrapper(commander, selectedPackages, 'yarn ' + yarnArgs.join(' ')),
    commander,
    packagesPath,
    selectedPackages,
    createTaskRunner(spawnArgs => runYarnWithPackageJsonMangling(yarnArgs, spawnArgs, packagesByName))
  );
}

function performList(commander) {
  const startTime = Date.now();
  const { packagesPath, selectedPackages } = getSelectedPackages(commander);
  runPackagesToposorted(
    new LoggerWrapper(commander, selectedPackages),
    commander,
    packagesPath,
    selectedPackages,
    (pkg) => {
      logger.info(pkg.name);
      return Promise.resolve();
    }
  );
}

function performRun(commander, scriptName, moreArgs) {
  const yarnArgs = [ 'run', scriptName  ].concat(moreArgs);
  const { packagesPath, packagesByName, selectedPackages } = getSelectedPackages(commander, package => !!package.scripts[scriptName]);
  runPackagesToposorted(
    new LoggerWrapper(commander, selectedPackages, 'yarn ' + yarnArgs.join(' '), scriptName),
    commander,
    packagesPath,
    selectedPackages,
    createTaskRunner(spawnArgs => runYarnWithPackageJsonMangling(yarnArgs, spawnArgs, packagesByName))
  );
}

function performExec(commander, binaryName, moreArgs) {
  const { packagesPath, selectedPackages } = getSelectedPackages(commander);
  runPackagesToposorted(
    new LoggerWrapper(commander, selectedPackages, binaryName + [ '' ].concat(moreArgs).join(' ')),
    commander,
    packagesPath,
    selectedPackages,
    createTaskRunner(spawnArgs => child_process.spawn(binaryName, moreArgs, spawnArgs))
  );
}

module.exports.findTransitiveDependentsOrDependencies = findTransitiveDependentsOrDependencies
module.exports.maybeIncludeDependentsAndDependencies = maybeIncludeDependentsAndDependencies
module.exports.applyIncludeExclude = applyIncludeExclude
module.exports.getSelectedPackages = getSelectedPackages
module.exports.performLink = performLink
module.exports.performInstall = performInstall
module.exports.performList = performList
module.exports.performRun = performRun
module.exports.performExec = performExec
