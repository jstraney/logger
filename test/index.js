const logLib = require('../index.js');

const logger = logLib('Test');

logger.info('test info');
logger.warn('test warn');
logger.error('test error');
