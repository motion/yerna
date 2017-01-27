// Copyright 2017 Palantir Technologies Inc.

const { version } = require('../package.json');
const { logger } = require('./logger');
const { formatErrorForConsole } = require('./error-handling');



function prelink(packagesByName) {
  linkPackages(packagesByName);
  logger.info(`yerna: linking all ${_.size(packagesByName).toString().cyan} package(s) before running tasks`);
}

function postlink(packagesByName) {
  linkPackages(packagesByName);
  logger.info(`yerna: re-linking all ${_.size(packagesByName).toString().cyan} package(s) after running tasks`);
}

function runCommand(flags, packagesPath, runTask) {
  logIntro();
}
