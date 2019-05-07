const logger = require('../utils/logger');
const RequestsExecutor = require('./RequestsExecutor');
const BookkeepingService = require('./BookkeepingService');
const PublishingService = require('./PublishingService');
const WorkersManagementService = require('./WorkersManagementService');
const AdsService = require('./AdsService');
const { Config } = require('./Config');


class CFRunner {
  /**
   *
   * @param {Config} config
   */
  constructor(config) {
    this.config = new Config(config);
  }

  /**
   * Get data from the API
   * @returns {Promise<any>}
   */
  async refresh() {
    const body = await RequestsExecutor.auth(this.config);
    if (body) {
      this.body = body;
      this.config.username = this.body.person.username;
    }
  }

  async runTask() {
    this.config.url = 'https://game.web-tycoon.com/api';
    try {
      logger.log(`Running all tasks for ${this.config.username}`);
      await this.refresh();
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in refresh: ${error && error.message ? error.message : error}`);
    }
    try {
      await PublishingService.publishContent(this.config, this.body);
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in publish content: ${error && error.message ? error.message : error}`);
    }
    try {
      await PublishingService.deleteSpam(this.config, this.body);
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in delete spam: ${error && error.message ? error.message : error}`);
    }
    try {
      await PublishingService.publishVersions(this.config, this.body);
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in publish versions: ${error && error.message ? error.message : error}`);
    }
    try {
      await WorkersManagementService.workBitches(this.config, this.body);
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in work bitches: ${error && error.message ? error.message : error}`);
    }
    try {
      await BookkeepingService.payThings(this.config, this.body);
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in pay domain: ${error && error.message ? error.message : error}`);
    }
    try {
      if (this.config.deleteOldAd) {
        await AdsService.handleAdBanners(this.config, this.body);
      }
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in handle ad banners: ${error && error.message ? error.message : error}`);
    }
  }

  getSafeConfigInfo() {
    return {
      username: this.config.username,
      userId: this.config.userId,
      lastSuccessful: this.config.lastSuccessful,
      lastFailed: this.config.lastFailed,
      error: this.config.error,
      connectionId: this.config.connId,
    };
  }
}

// const { constConfigs } = require('../config.json');

// const config = constConfigs[0];

// new CFRunner(config).runTask();

module.exports = {
  CFRunner,
};
