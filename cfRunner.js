const moment = require('moment');
const request = require('request');
const endpoint = require('./endpoint');
const utils = require('./utils');
const logger = require('./logger');

class CFRunner {
  constructor(config) {
    this.config = config;
  }

  /**
   * Get data from the API
   * @returns {Promise<any>}
   */
  getUserData() {
    return new Promise((resolve, reject) => {
      let body = '';
      let parsedBody = {};
      request.get(
        endpoint.getAuthUrl(
          this.config.url,
          this.config.userId,
          this.config.accessToken,
          this.config.connectionId,
          utils.getTs()
        )
      )
        .on('response', (response) => {
        })
        .on('error', (err) => reject(err))
        .on('data', (chunk) => {
          body += chunk;
        })
        .on('end', () => {
          parsedBody = JSON.parse(body);
          return resolve(parsedBody);
        });
    });
  }

  getSafeConfigInfo() {
    return {
      username: this.config.username,
      userId: this.config.userId,
      lastSuccessful: this.config.lastSuccessful,
      lastFailed: this.config.lastFailed,
      error: this.config.error,
      connectionId: this.config.connectionId,
    };
  }

  async scheduleTasks(config, timeout = 1000 * 60 * 5) {
    this.config = config;
    this.config.url = 'https://game.web-tycoon.com/api';
    await this.refresh();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    logger.log(`Scheduling tasks execution for ${this.config.username} each ${timeout} ms`);
    await this.runTask();
    this.intervalId = setInterval(() => {
      this.runTask();
    }, timeout);
  }

  async runTask() {
    try {
      logger.log(`Running publish Fresh Content and delete spam tasks for ${this.config.username}`);
      await this.refresh();
      await this.publishContent();
      await this.deleteSpam();
    } catch (error) {
      logger.log(`Error: ${error && error.message ? error.message : error}`);
    }
  }

  updateConfigLog(error) {
    if (error) {
      this.config.error = error;
      this.config.lastFailed = moment()
        .format('YYYY/MM/DD HH:mm:ss');
    } else {
      this.config.error = null;
      this.config.lastSuccessful = moment()
        .format('YYYY/MM/DD HH:mm:ss');
    }
  }

  async refresh() {
    this.body = await this.getUserData();
    this.config.username = this.body.person.username;
    this.updateConfigLog();
  }

  async publishContent() {
    const unlimitedSites = this.body.sites.filter((site) => {
      const { sitespeed } = site;
      return Array.isArray(sitespeed) && sitespeed[sitespeed.length - 1] && !sitespeed[sitespeed.length - 1].limited;
    });
    const sitesWithoutBuff = unlimitedSites.filter((site) => {
      const { buffs } = site;
      return Array.isArray(buffs) && buffs.filter(buff => buff.object === 'content').length === 0;
    });
    const sitesWithoutBuffButWithStoredContent = sitesWithoutBuff.filter((site) => {
      const contents = site.content;
      return contents.filter(content => content.status === 1).length > 0;
    });

    for (const site of sitesWithoutBuffButWithStoredContent) {
      const lastContent = site.content.find(content => content.status === 2);
      let interestedContent = site.content.find(content => content.status === 1 && content.contenttypeId !== lastContent.contenttypeId);
      if (!interestedContent) {
        interestedContent = site.content.find(content => content.status === 1);
      }
      logger.log(`${new Date()}: processing site ${site.domain}`);
      try {
        const url = endpoint.getPublishFreshContentUrl(this.config.url, this.config.userId, site.id, interestedContent.id, this.config.accessToken, this.config.connectionId, utils.getTs());
        const response = await utils.sendPostRequest(url);
        if (response.error) {
          this.updateConfigLog(response.error);
          logger.log(`Error: ${response.error.statusCode}, ${response.error.message}`);
        } else {
          this.updateConfigLog();
        }
        await utils.sleep(1500);
      } catch (error) {
        logger.log(error.message);
      }
    }
  }

  async deleteSpam() {
    for (const site of this.body.sites) {
      const containsSpam = Array.isArray(site.links) && site.links.find(link => link.type === 2 && site.id === link.fromSiteId);
      if (!containsSpam) {
        continue;
      }
      try {
        logger.log(`${new Date()}: Deleting spam from site ${site.domain}`);
        const url = endpoint.getDeleteSpamUrl(this.config.url, this.config.userId, site.id, this.config.accessToken, this.config.connectionId, utils.getTs());
        const response = await utils.sendDeleteRequest(url);
        if (response.error) {
          this.updateConfigLog(response.error);
          logger.log(`Error: ${response.error.statusCode}, ${response.error.message}`);
        } else {
          this.updateConfigLog();
        }
        await utils.sleep(1500);
      } catch (error) {
        logger.log(error.message);
      }
    }
  }
}

module.exports = {
  CFRunner,
};
