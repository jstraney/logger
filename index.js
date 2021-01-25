// bootstraping console to use morgan/winston
const util = require('util');

const chalk = require('chalk');

const {
  createLogger,
  format,
  transports
} = require('winston');

const moment = require('moment');

const DailyRotateFile = require('winston-daily-rotate-file');

const {
  combine,
  label,
  prettyPrint,
  printf,
  splat,
  timestamp,
} = format;

const lpad = (str, padding = ' ', num = 1) => {
  return padding.repeat(num).concat(str);
};

const consoleLogFormat = printf(function (info) {

  let { level } = info;

  if (level === 'info') {

    level = chalk.green(level);

  } else if (level === 'indiscreet') {

    level = chalk.green(level);

  } else if (level === 'warn') {

    level = chalk.yellow(level);

  } else if (level === 'error') {

    level = chalk.red(level);

  } else if (level === 'hook') {

    level = chalk.blue(level);

  } else if (level === 'verbose') {

    level = chalk.magenta(level);

  }

  const message = typeof info.message === 'object'
    ? JSON.stringify(info.message, 2)
    : info.message;

  const out = ['[',info.label,']',level,':',message].join(' ')

  // no proceeding timestamp or label
  return level === 'debug'
    ? chalk.gray(out)
    : out;

});

// no ANSI colors in logs or fancy emojis. just plain old logging.
// In addition, any level of "indiscreet" gets redacted because it is
// assumed to be something secret (generated passwords).
const fileLogFormat = printf((info) => {

  const { level } = info;

  // we may still want to know that something was
  // run to generate a secret at this time even if we do not print the thing
  // in question.
  if (level === 'indiscreet') {
    return [customTimestamp(),'[',info.label,']',info.level,': Redacted'].join(' ');
  }

  const message = typeof info.message === 'object'
    ? JSON.stringify(info.message)
    : info.message;

  return [customTimestamp(),'[',info.label,']',info.level,':',message].join(' ');

});

const customTimestamp = () => {

  return moment().format('YYYY-DD-MM_hh:mm:ss');

}

const {
  LOG_LEVEL = 'info',
  LOG_DIR = './log',
  LOG_TAB_CHAR = '..',
  LOG_MAX_TAB = 4,
} = process.env;

const tabFormat = format((info, opts) => {
  if (opts.indent > 0) {
    info.message = lpad(info.message, LOG_TAB_CHAR, opts.indent);
  }
  return info;
});


module.exports = (logLabel) => {

  const tabFormatOptions = {
    indent: 0,
  };

  const logTransports = {
    cli: new transports.Console({
      json: true,
      format: combine(
        label({label: logLabel}),
        splat(),
        tabFormat(tabFormatOptions),
        consoleLogFormat,
      )
    }),
    file: new DailyRotateFile({
      format: combine(
        label({label: logLabel}),
        splat(),
        tabFormat(tabFormatOptions),
        fileLogFormat,
      ),
      json: true,
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      dirname: LOG_DIR,
    }),
  };

  const logTransportsArr = [logTransports.cli];

  // write to log dir if it is defined
  if (LOG_DIR) {
    logTransportsArr.push(logTransports.file);
  }

  const level = LOG_LEVEL;

  const loggerInstance = createLogger({
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      indiscreet: 3,
      verbose: 4,
      debug: 5,
      hook: 6,
    },
    level,
    prettyPrint: JSON.stringify,
    transports: logTransportsArr,
    exitOnError: false
  });

  loggerInstance.tab = () => {
    const { indent } = tabFormatOptions;
    const nextIndent = Math.min(indent + 1, LOG_MAX_TAB);
    tabFormatOptions.indent = nextIndent;
  };

  loggerInstance.shiftTab = () => {
    const { indent } = tabFormatOptions;
    const nextIndent = Math.max(0, indent - 1);
    tabFormatOptions.indent = nextIndent;
  };

  return loggerInstance;

};
