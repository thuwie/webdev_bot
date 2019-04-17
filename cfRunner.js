const moment = require('moment');
const axios = require('axios');

const endpoint = require('./utils/APIService').APIService;
const utils = require('./utils/utils');
const logger = require('./utils/logger');

class CFRunner {
  constructor(config) {
    this.config = config;
  }

  /**
   * Get data from the API
   * @returns {Promise<any>}
   */
  async getUserData() {
    const url = endpoint.getAuthUrl(this.config);
    try {
      const parsedBody = await axios.get(url);
      this.updateConfigLog();
      return parsedBody.data;
    } catch (error) {
      this.updateConfigLog(error);
      logger.log(error, 'ERROR');
    }
    return null;
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
      await this.publishVersions();
      await this.workBitches();
    } catch (error) {
      logger.log(`Error: ${error && error.message ? error.message : error}`);
    }
  }

  updateConfigLog(error) {
    const timestamp = moment().format('YYYY/MM/DD HH:mm:ss');
    if (error) {
      this.config.error = error;
      this.config.lastFailed = timestamp;
    } else {
      this.config.error = null;
      this.config.lastSuccessful = timestamp;
    }
  }

  async refresh() {
    this.body = await this.getUserData();
    this.config.username = this.body.person.username;
    this.updateConfigLog();
  }

  async workBitches() {
    // we need fresh content here
    this.body = await this.getUserData();
    const { sites, notifications, tasks, workers } = this.body;

    const sortedSites = sites.sort((site1, site2) => site1.content.length - site2.content.length);
    let siteIndexGoWork = 0;

    const notificationsMarketingDone = notifications.filter(n => n.action === 'stopWork' && n.data.zone === 'marketing');

    for (const notification of notificationsMarketingDone) {
      try {
        const deleteUrl = endpoint.getFinishWorkerTaskForSiteIdUrl(this.config, notification.siteId, notification.workerId);
        await axios.delete(deleteUrl);
        this.updateConfigLog();
        await utils.sleep(1000);

        // TODO
        // if (worker.tired) {
        //   go sleep
        // }

        // yes, I am genius
        while (tasks.find(task => task.scope === 'marketing' && task.siteId === sortedSites[siteIndexGoWork].id)) {
          siteIndexGoWork += 1;
        }

        console.log(`adding worker ${notification.workerId} to site ${sortedSites[siteIndexGoWork].domain}`);
        const pushUrl = endpoint.getSendWorkerToWork(this.config, sortedSites[siteIndexGoWork].id, 4);
        await axios.post(pushUrl, {
          workerIds: [notification.workerId],
        });

        siteIndexGoWork += 1;
        this.updateConfigLog();
        await utils.sleep(1000);
      } catch (error) {
        this.updateConfigLog(error);
        logger.log(error, 'ERROR');
      }
    }
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
        const url = endpoint.getPublishFreshContentUrl(this.config, site.id, interestedContent.id);
        await axios.post(url);
        this.updateConfigLog();

        await utils.sleep(1500);
      } catch (error) {
        this.updateConfigLog(error);
        logger.log(error, 'ERROR');
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
        const url = endpoint.getDeleteSpamUrl(this.config, site.id);

        await axios.delete(url);
        this.updateConfigLog();

        await utils.sleep(1500);
      } catch (error) {
        this.updateConfigLog(error);
        logger.log(error, 'ERROR');
      }
    }
  }

  isNewVersionReady(site) {
    const isDesignReady = site.designValue === site.limit.design;
    const isBackendReady = site.backendValue === site.limit.backend;
    const isFrontendReady = site.frontendValue === site.limit.frontend;
    return isDesignReady && isBackendReady && isFrontendReady;
  }

  async publishVersions() {
    try {
      for (const site of this.body.sites) {
        if (this.isNewVersionReady(site)) {
          const url = endpoint.getPublishSiteVersionUrl(this.config, site.id);
          try {
            const response = await axios.post(url);
            logger.log(`Publish version for the [${site.domain}] - status: ${response.status}`);
          } catch (error) {
            logger.log(error, 'ERROR');
          }
        }
      }
    } catch (error) {
      logger.log(error.message);
    }
  }
}

module.exports = {
  CFRunner,
};
