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
      await utils.sleep(1500);
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
    // await this.refresh();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    logger.log(`[${this.config.hiddenName}]: Scheduling tasks execution for ${this.config.hiddenName} each ${timeout} ms`);
    await this.runTask();
    this.intervalId = setInterval(() => {
      this.runTask();
    }, timeout);
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
      await this.publishContent();
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in publish content: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.deleteSpam();
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in delete spam: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.publishVersions();
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in publish versions: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.workBitches();
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in work bitches: ${error && error.message ? error.message : error}`);
    }
    try {
      await this.payThings();
    } catch (error) {
      logger.log(`[${this.config.username}]: Error in pay domain: ${error && error.message ? error.message : error}`);
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
    return this.body;
  }

  async getFromRest(worker, task) {
    try {
      const getCancelVacationUrl = endpoint.getCancelRestUrl(this.config, worker.id, task.id);
      await axios.post(getCancelVacationUrl);
      this.updateConfigLog();
      await utils.sleep(1000);
    } catch (error) {
      logger.log(`[${this.config.username}]: failed to get back from vacation worker ${worker.name}`);
      this.updateConfigLog(error);
      logger.log(error, 'ERROR');
      throw error;
    }
  }

  async goToRest(worker) {
    try {
      logger.log(`[${this.config.username}]: Sending worker ${worker.name} to vacation`);
      const goRestUrl = endpoint.getSendWorkerToRest(this.config, worker.id);
      await axios.post(goRestUrl);
    } catch (error) {
      logger.log(`[${this.config.username}]: failed to send worker ${worker.name} to vacation`, 'ERROR');
      this.updateConfigLog(error);
      logger.log(error, 'ERROR');
      throw error;
    }
  }

  async goToWork(sitesWithFreePlaceForContentWitoutWorkers, worker) {
    const destSite = sitesWithFreePlaceForContentWitoutWorkers[0];

    if (!destSite) {
      logger.log(`[${this.config.username}]: no sites with free slots for work left! ${worker.name} goes to vacation`);
      await this.goToRest(worker);
      return;
    }

    try {
      logger.log(`[${this.config.username}]: adding worker ${worker.name} to site ${destSite.domain}`);
      const pushUrl = endpoint.getSendWorkerToWork(this.config, destSite.id, 4);
      await axios.post(pushUrl, {
        workerIds: [worker.id],
      });

      // remove first element from array if everything is ok
      sitesWithFreePlaceForContentWitoutWorkers.shift();
      this.updateConfigLog();
      await utils.sleep(1000);
    } catch (error) {
      logger.log(`[${this.config.username}]: failed to send worker ${worker.name} to site ${destSite.domain}`, 'ERROR');
      this.updateConfigLog(error);
      logger.log(error, 'ERROR');
      throw error;
    }
  }

  async goToWorkOrRest(sitesWithFreePlaceForContentWithoutWorkers, worker) {
    if (worker.progress.energy < 20) {
      await this.goToRest(worker);
    } else {
      await this.goToWork(sitesWithFreePlaceForContentWithoutWorkers, worker);
    }
  }

  async payThings() {
    const currentTime = utils.getTime();
    for (const site of this.body.sites) {
      if (site.hostingPaidTill && site.hostingPaidTill - currentTime < 79200) {
        await this.paySite(site, 'hostings');
      }
      if (site.domainTill && site.domainTill - currentTime < 260000) {
        await this.paySite(site, 'domains');
      }
    }

    for (const worker of this.body.workers) {
      if (worker.paidTill && worker.paidTill - currentTime < 79200) {
        await this.payWorker(worker);
      }
    }
  }

  async workBitches() {
    // we need fresh content here
    this.body = await this.getUserData();
    const {
      sites, tasks, workers,
    } = this.body;

    const sitesWithFreePlaceForContentWithoutWorkers = sites
      .filter(site => site.content.filter(content => content.status === 1).length < 4)
      .filter((site) => {
        const taskForSite = tasks.find(task => task.scope === 'marketing' && (task.siteId === site.id));
        return taskForSite === undefined;
      })
      .filter(site => site.level > 0)
      .sort((site1, site2) => site1.content.length - site2.content.length);

    const marketingWorkers = workers
      .filter((worker) => {
        const {
          marketing, design, frontend, backend,
        } = worker;
        return marketing >= backend && marketing >= design && marketing >= frontend;
      });

    for (const worker of marketingWorkers) {
      try {
        const workerTask = tasks.find(task => task.workers && (task.workers[0] === worker.id));
        if (!workerTask) {
          // no tasks - go to work! (if not tired xd)
          await this.goToWorkOrRest(sitesWithFreePlaceForContentWithoutWorkers, worker);
          continue;
        } else if (workerTask.zone === 'vacation') {
          if (worker.progress.energy > 95 && sitesWithFreePlaceForContentWithoutWorkers.length > 0) {
            await this.getFromRest(worker, workerTask);
            await utils.sleep(500);
            await this.goToWork(sitesWithFreePlaceForContentWithoutWorkers, worker);
            continue;
          } else {
            logger.log(`[${this.config.username}]: ${worker.name} has a rest and energy is ${worker.progress.energy}. Don't touch him`);
            continue;
          }
        } else if (workerTask.zone === 'marketing') {
          const { siteId } = workerTask;
          const site = sites.find(currSite => currSite && (currSite.id === siteId));
          const countOfPreparedContent = site.content.filter(content => content.status === 1).length;
          if (countOfPreparedContent === 4) {
            try {
              logger.log(`[${this.config.username}]: getting ${worker.name} back from task on site ${site.domain}`);
              const deleteUrl = endpoint.getFinishWorkerTaskForSiteIdUrl(this.config, siteId, worker.id);
              await axios.delete(deleteUrl);
              this.updateConfigLog();
              await utils.sleep(1000);
            } catch (error) {
              logger.log(`[${this.config.username}]: failed to get ${worker.name} back from task on site ${site.domain}`);
              this.updateConfigLog(error);
              logger.log(error, 'ERROR');
            }

            await this.goToWorkOrRest(sitesWithFreePlaceForContentWithoutWorkers, worker);
          }
        } else {
          logger.log(`[${this.config.username}]: i dont know what to do with ${worker.name}`);
          continue;
        }
      } catch (error) {
        logger.log(`[${this.config.username}]: failed handle worker ${worker.name}`);
        logger.log(error, 'ERROR');
      }

      // go to work
    }

    // const marketingTasks = tasks.filter(t => t.tasktypeId === 4);
    // for (const task of marketingTasks) {
    //   const { siteId } = task;
    //   const workerId = task.workers[0];
    //   const site = sites.find(currSite => currSite && (currSite.id === siteId));
    //   const countOfPreparedContent = site.content.filter(content => content.status === 1).length;
    //   if (countOfPreparedContent === 4) {
    //     try {
    //       const deleteUrl = endpoint.getFinishWorkerTaskForSiteIdUrl(this.config, siteId, workerId);
    //       await axios.delete(deleteUrl);
    //       this.updateConfigLog();
    //       await utils.sleep(1000);
    //
    //       const worker = workers.find(w => w.id === workerId);
    //       if (!worker) {
    //         logger.log(`[${this.config.username}]: Can't find worker ${workerId} in list of workers... Strange.. just skip him`);
    //         continue;
    //       }
    //
    //       if (worker.progress.energy < 5) {
    //         logger.log(`[${this.config.username}]: Sending worker ${worker.name} to vacation`);
    //         const goRestUrl = endpoint.getSendWorkerToRest(this.config, workerId);
    //         await axios.post(goRestUrl);
    //         continue;
    //       }
    //
    //       // yes, I am genius
    //       // increment siteIndexGoToWork if on first sites someone already does some work
    //       while (tasks.find(task => task.scope === 'marketing'
    //           && sortedSites[siteIndexGoWork]
    //           && (task.siteId === sortedSites[siteIndexGoWork].id)
    //           && sortedSites[siteIndexGoWork].level < 1)) {
    //         siteIndexGoWork += 1;
    //       }
    //
    //       const destSite = sortedSites[siteIndexGoWork];
    //
    //       if (!destSite) {
    //         logger.log(`[${this.config.username}]: all sites are busy with CMs! so worker ${workerId} is just chilling`);
    //       }
    //
    //       if (destSite.content.filter(content => content.status === 1).length === 4) {
    //         logger.log(`[${this.config.username}]: all sites are full or in progress! so worker ${workerId} is just chilling`);
    //         try {
    //           const goRestUrl = endpoint.getSendWorkerToRest(this.config, workerId);
    //           await axios.post(goRestUrl);
    //         } catch (error) {
    //           logger.log(`[${this.config.username}]: failed to send worker ${workerId} to rest`, 'ERROR');
    //           this.updateConfigLog(error);
    //           logger.log(error, 'ERROR');
    //         }
    //         continue;
    //       }
    //
    //       logger.log(`[${this.config.username}]: adding worker ${workerId} to site ${destSite.domain}`);
    //       const pushUrl = endpoint.getSendWorkerToWork(this.config, destSite.id, 4);
    //       await axios.post(pushUrl, {
    //         workerIds: [workerId],
    //       });
    //
    //       siteIndexGoWork += 1;
    //       this.updateConfigLog();
    //       await utils.sleep(1000);
    //     } catch (error) {
    //       this.updateConfigLog(error);
    //       logger.log(error, 'ERROR');
    //     }
    //   }
    // }
  }

  async publishContent() {
    // const unlimitedSites = this.body.sites.filter((site) => {
    //   const { sitespeed } = site;
    //   const currentSitespeed = sitespeed[sitespeed.length - 1];
    //   return Array.isArray(sitespeed) && sitespeed[sitespeed.length - 1] && !(currentSitespeed.communityValue + currentSitespeed.genericValue >= currentSitespeed.limit);
    // });
    const sitesWithoutBuff = this.body.sites.filter((site) => {
      const { buffs } = site;
      return Array.isArray(buffs) && buffs.filter(buff => buff.object === 'content').length === 0;
    });
    const sitesWithoutBuffButWithStoredContent = sitesWithoutBuff.filter((site) => {
      const contents = site.content;
      return contents.filter(content => content.status === 1).length > 0;
    });

    for (const site of sitesWithoutBuffButWithStoredContent) {
      const lastContent = site.content.find(content => content.status === 2);
      let interestedContent = site.content.find(content => content.status === 1);

      if (lastContent) {
        const goodPotentialContent = site.content.find(content => content.status === 1 && content.contenttypeId !== lastContent.contenttypeId);
        if (goodPotentialContent) {
          interestedContent = goodPotentialContent;
        }
      }

      logger.log(`[${this.config.username}]: publishing fresh content to site ${site.domain}`);
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
        logger.log(`[${this.config.username}]: Deleting spam from site ${site.domain}`);
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
              await utils.sleep(1500);
              logger.log(`[${this.config.username}]: Publish version for the [${site.domain}] - status: ${response.status}`);
            } catch (error) {
              this.updateConfigLog(error);
              logger.log(error, 'ERROR');
            }
          }
        }
      }
    } catch (error) {
      logger.log(error.message);
    }
  }

  async paySite(site, type) {
    try {
      logger.log(`[${this.config.username}]: Paying ${type} for the site ${site.domain}`);
      const url = endpoint.getPaySiteUrl(this.config, site.id, type);
      await axios.post(url);
      await utils.sleep(1500);
    } catch (error) {
      this.updateConfigLog(error);
      logger.log(error, 'ERROR');
    }
  }

  async payWorker(worker) {
    try {
      logger.log(`[${this.config.username}]: Paying worker ${worker.name}`);
      const url = endpoint.getPayWorkerUrl(this.config, worker.id);
      await axios.post(url);
      await utils.sleep(1500);
    } catch (error) {
      this.updateConfigLog(error);
      logger.log(error, 'ERROR');
    }
  }
}

// const { constConfigs } = require('./config.json');
// const config = constConfigs[0];
//
// new CFRunner(config).scheduleTasks(config, 300000);

module.exports = {
  CFRunner,
};
