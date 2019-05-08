const moment = require('moment');

class Config {
  constructor(config) {
    this.hiddenName = config.hiddenName;
    this.url = config.url;
    this.userId = config.userId;
    this.accessToken = config.accessToken;
    this.connectionId = config.connectionId;
    this.lvlUp = config.lvlUp;
    this.connId = config.connId;
    this.deleteOldAd = config.deleteOldAd;
    this.deleteLongContent = config.deleteLongContent;

    this.socketUrl = config.socketUrl;
    this.socketLogin = config.socketLogin;

    this.username = config.username;
  }

  updateLogInfo(error) {
    const timestamp = moment().format('YYYY/MM/DD HH:mm:ss');
    if (error) {
      this.error = error;
      this.lastFailed = timestamp;
    } else {
      this.error = null;
      this.lastSuccessful = timestamp;
    }
  }
}

module.exports = {
  Config,
};
