// Copyright 2017 Palantir Technologies Inc.

require('colors');
const { formatErrorForConsole } = require('./error-handling');

const LOG_FILENAME = 'yerna.log';

const winston = require('winston');

winston.configure({
  transports: [
    new winston.transports.Console({ showLevel: false }),
    new winston.transports.File({ filename: LOG_FILENAME })
  ]
});

const START_TIME = Date.now();

process.on('exit', function() {
  console.log(arguments);
  logger.info(`yerna: took ${Math.round((Date.now() - startTime) / 1000 * 100) / 100}s`);
});

function formatList(strings, conjunction = 'or', oxfordComma = false) {
  if (oxfordComma) {
    throw new Error(`yerna: oops, don't use an Oxford comma!`);
  }

  if (strings.length <= 1) {
    return strings.join('');
  } else {
    return `${strings.slice(0, strings.length - 1).join(', ')} ${conjunction} ${strings[strings.length - 1]}`
  }
}

function logIntro(selectedPackages, taskName = null) {
  const packageCount = selectedPackages.length.toString().cyan;
  logger.info(`yerna: v${version}`);
  if (taskName) {
    logger.info(`yerna: running ${taskName.cyan} for ${packageCount} package(s)`);
  } else {
    logger.info(`yerna: ${packageCount} package(s)`);
  }
}

function logFilteringOptions(flags, scriptName = null) {
  const include = flags.include.length ? formatList(flags.include.map(r => r.magenta)) : null;
  const exclude = flags.exclude.length ? formatList(flags.exclude.map(r => r.magenta)) : null;
  const { dependents, dependencies } = flags;

  if (include) {
    logger.info(`\nyerna:  - that match ${include}`);
  }

  if (exclude) {
    logger.info(`\nyerna:  - that do not match ${exclude}`);
  }

  if (scriptName) {
    logger.info(`\nyerna:  - that have a ${scriptName.magenta} script`);
  }

  if (dependents || dependencies) {
    let logline = '';

    if (dependents && dependencies) {
      logline = `\nyerna:  - including ${'all transitive dependents and their dependencies'.magenta}`;
    } else if (dependents) {
      logline = `\nyerna:  - including ${'all transitive dependents'.magenta}`;
    } else if (dependencies) {
      logline = `\nyerna:  - including ${'all transitive dependencies'.magenta}`;
    }

    if (exclude) {
      logline += ` (even if they match --exclude)`;
    }

    logger.info(logline);
  }
}

function logErrorPostlude(selectedPackages, e, taskName = null) {
  const packageCount = selectedPackages.length.toString().cyan;
  logger.error(formatErrorForConsole(e).red);
  if (taskName) {
    logger.error(`${'yerna: errors while running'.red} ${taskName.cyan} ${'in'.red} ${packageCount} ${'package(s)'.red}`);
  } else {
    logger.error(`${'yerna: errors while running in'.red} ${packageCount} ${'package(s)'.red}`);
  }
  logger.error(selectedPackages.map(pkg => pkg.name).join('\nyerna:  - ').red);
  logger.error('yerna: packages may be in an inconsistent state, including not being linked to each other'.bgRed);
}

function logSuccessPostlude(selectedPackages, taskName = null) {
  const packageCount = selectedPackages.length.toString().cyan;
  logger.info(`yerna: ran ${taskName ? taskName.cyan + ' ' : ''}successfully in ${packageCount} package(s)`);
  logger.debug(selectedPackages.map(pkg => pkg.name).join('\nyerna:  - '));
}

module.exports = {
  logger
};
