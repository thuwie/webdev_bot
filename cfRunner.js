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
    } catch (error) {
      logger.log(`Error in refresh: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.publishContent();
    } catch (error) {
      logger.log(`Error in publish content: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.deleteSpam();
    } catch (error) {
      logger.log(`Error in delete spam: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.publishVersions();
    } catch (error) {
      logger.log(`Error in publish versions: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.workBitches();
    } catch (error) {
      logger.log(`Error in work bitches: ${error && error.message ? error.message : error}`);
    }
  }

  updateConfigLog(error) {
    const timestamp = moment()
      .format('YYYY/MM/DD HH:mm:ss');
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
    const {
      sites, tasks, workers,
    } = this.body;

    const sortedSites = sites.sort((site1, site2) => site1.content.length - site2.content.length);
    let siteIndexGoWork = 0;

    const marketingTasks = tasks.filter(t => t.tasktypeId === 4);
    for (const task of marketingTasks) {
      const { siteId } = task;
      const workerId = task.workers[0];
      const site = sites.find(currSite => currSite.id === siteId);
      const countOfPreparedContent = site.content.filter(content => content.status === 1).length;
      if (countOfPreparedContent === 4) {
        try {
          const deleteUrl = endpoint.getFinishWorkerTaskForSiteIdUrl(this.config, siteId, workerId);
          await axios.delete(deleteUrl);
          this.updateConfigLog();
          await utils.sleep(1000);

          // const worker = workers.filter(w => w.id === workerId);
          // if (worker.progress.energy < 5) {
          //   logger.log(`[${this.config.username}]: Sending worker ${worker.name} to vacation`);
          //   const goRestUrl = endpoint.getSendWorkerToRest(this.config, workerId);
          //   await axios.post(goRestUrl);
          //   continue;
          // }

          // yes, I am genius
          // increment siteIndexGoToWork if on first sites someone already does some work
          while (tasks.find(task => task.scope === 'marketing' && task.siteId === sortedSites[siteIndexGoWork].id)) {
            siteIndexGoWork += 1;
          }

          const destSite = sortedSites[siteIndexGoWork];

          console.log(`[${this.config.username}]: adding worker ${workerId} to site ${destSite.domain}`);
          const pushUrl = endpoint.getSendWorkerToWork(this.config, destSite.id, 4);
          await axios.post(pushUrl, {
            workerIds: [workerId],
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
      const anyContent = site.content.find(content => content.status === 1);
      let interestedContent;

      if (!lastContent) {
        interestedContent = anyContent;
      } else {
        const goodPotentialContent = site.content.find((content) => {
          return content.status === 1 && content.contenttypeId !== lastContent.contenttypeId;
        });
        if (goodPotentialContent) {
          interestedContent = goodPotentialContent;
        }
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
        if (this.config.lvlUp && this.config.lvlUp.indexOf(site.domain) >= 0) {
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
      }
    } catch (error) {
      logger.log(error.message);
    }
  }
}

const { constConfig } = require('./config');

new CFRunner(constConfig[0]).getUserData();

module.exports = {
  CFRunner,
};
