const moment = require('moment');

module.exports = {
  log: function log(message, level = 'INFO') {
    const time = moment().format('HH:mm:ss');

    if (level === 'ERROR') {
      console.trace(`[${time}] - ${level} - ${message}`);
    } else {
      console.log(`[${time}] - ${level} - ${message}`);
    }
  },
};

// console.log(new Date(1554392412929).toLocaleString());
