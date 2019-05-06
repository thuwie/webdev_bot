const axios = require('axios');
const utils = require('../utils/utils');
const logger = require('../utils/logger');

/**
 *
 * @param {Config} config
 * @param url
 * @param requestBody
 * @returns {Promise<void>}
 */
async function executePostAndSleep(config, url, requestBody) {
  await axios.post(url, requestBody);
  config.updateLogInfo();
  await utils.sleep(1500);
}

/**
 *
 * @param {Config} config
 * @param url
 * @returns {Promise<void>}
 */
async function executeDeleteAndSleep(config, url) {
  await axios.delete(url);
  config.updateLogInfo();
  await utils.sleep(1500);
}

/**
 *
 * @param {Config} config
 * @param url
 * @returns {Promise<*>}
 */
async function executeGetAndSleep(config, url) {
  const parsedBody = await axios.get(url);
  config.updateLogInfo();
  await utils.sleep(1500);
  return parsedBody.data;
}

async function executeRequest(config, func, errMsg) {
  try {
    return await func();
  } catch (error) {
    if (errMsg) {
      logger.log(errMsg, 'ERROR');
    }
    config.updateLogInfo(error);
    logger.log(error, 'ERROR');
  }
  return false;
}

module.exports = {
  /**
   *
   * @param {Config} config
   * @param ts
   * @returns {Promise<*>}
   */
  async auth(config, ts = utils.getTs()) {
    const url = `${config.url}/users/${config.userId}/init?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    return executeRequest(config, executeGetAndSleep.bind(this, config, url));
  },

  async publishContent(config, site, contentId, ts = utils.getTs()) {
    const url = `${config.url}/content/${config.userId}/${site.id}/${contentId}?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: publishing fresh content to site ${site.domain}`);
    return executeRequest(config, executePostAndSleep.bind(this, config, url));
  },

  async deleteSpam(config, site, ts = utils.getTs()) {
    const url = `${config.url}/links/${config.userId}/${site.id}/spam?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: Deleting spam from site ${site.domain}`);
    return executeRequest(config, executeDeleteAndSleep.bind(this, config, url));
  },

  async publishVersion(config, site, ts = utils.getTs()) {
    const url = `${config.url}/sites/${config.userId}/${site.id}/levelUp?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: Publishing new version of site ${site.domain}`);
    return executeRequest(config, executePostAndSleep.bind(this, config, url));
  },

  async finishWorkerTask(config, site, worker, ts = utils.getTs()) {
    const url = `${config.url}/sites/${config.userId}/${site.id}/${worker.id}?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: getting ${worker.name} back from task on site ${site.domain}`);
    return executeRequest(config, executeDeleteAndSleep.bind(this, config, url),
      `[${config.username}]: failed to get ${worker.name} back from task on site ${site.domain}`);
  },

  async sendWorkerToWork(config, site, taskTypeId, worker, ts = utils.getTs()) {
    // 4 is marketing
    // 3 is design
    // 2 is frontend
    // 1 backend
    const url = `${config.url}/sites/${config.userId}/${site.id}/${taskTypeId}/addTask?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: adding worker ${worker.name} to site ${site.domain}`);
    return executeRequest(config, executePostAndSleep.bind(this, config, url, { workerIds: [worker.id] }),
      `[${config.username}]: failed to send worker ${worker.name} to site ${site.domain}`);
  },

  async sendWorkerToRest(config, worker, ts = utils.getTs()) {
    const url = `${config.url}/workers/${config.userId}/vacation/send/${worker.id}?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: Sending worker ${worker.name} to vacation`);
    return executeRequest(config, executePostAndSleep.bind(this, config, url),
      `[${config.username}]: failed to send worker ${worker.name} to vacation`);
  },

  async getFromRest(config, worker, taskId, ts = utils.getTs()) {
    const url = `${config.url}/tasks/${config.userId}/${taskId}/${worker.id}/cancelVacation?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: Getting ${worker.name} back from vacation`);
    return executeRequest(config, executePostAndSleep.bind(this, config, url),
      `[${config.username}]: failed to get back from vacation worker ${worker.name}`);
  },

  async payWorker(config, worker, ts = utils.getTs()) {
    const url = `${config.url}/workers/${config.userId}/${worker.id}/payInAdvance?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: Paying worker ${worker.name}`);
    return executeRequest(config, executePostAndSleep.bind(this, config, url));
  },

  async paySite(config, site, type, ts = utils.getTs()) {
    // type - hostings || domains
    const url = `${config.url}/${type}/${config.userId}/${site.id}/payInAdvance?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(`[${config.username}]: Paying ${type} for the site ${site.domain}`);
    return executeRequest(config, executePostAndSleep.bind(this, config, url));
  },

  async deleteContentItem(config, site, contentItem, ts = utils.getTs()) {
    const url = `${config.url}/content/${config.userId}/${site.id}/${contentItem.id}/deleteOffer?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    logger.log(
      `[${config.username}]: deleting content of type ${contentItem.contenttypeId} from site ${site.domain}`,
    );
    return executeRequest(config, executeDeleteAndSleep.bind(this, config, url));
  },
};
