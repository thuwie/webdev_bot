const axios = require('axios');
const endpoint = require('../utils/APIService').APIService;
const utils = require('../utils/utils');
const logger = require('../utils/logger');

const {constConfigs} = require('../config.json');
const config = constConfigs[0];

/**
 * Get data from the API
 * @returns {Promise<any>}
 */
async function getUserData() {
  const url = endpoint.getAuthUrl(config);
  try {
    const parsedBody = await axios.get(url);
    return parsedBody.data;
  } catch (error) {
    logger.log(error, 'ERROR');
  }
}

// 1. create site     +
// 2. calculate time  ?
// 3. up 1 time       +
// 4. redesign        +
// 5. run while version <15
// 6. delete

async function createSite() {
  const url = endpoint.getCreateSiteUrl(config);
  const siteName = `exp-${hiddenName}.free`;
  const body = {
    domain: siteName,
    domainzoneId: 1,
    engineId: 8, // first fast engine
    sitethemeId: 1,
    sitetypeId: 3
  };
  try {
    const response = await axios.post(url, body);
    logger.log(`[${this.config.username}]: Publish version for the [${site.domain}] - status: ${response.status}`);
    return siteName;
  } catch (error) {
    logger.log(error, 'ERROR');
    return '';
  }
}

async function publishVerison(site) {
  if (isNewVersionReady(site)) {
    const url = endpoint.getPublishSiteVersionUrl(config);
    try {
      const response = await axios.post(url);
      logger.log(`[${this.config.username}]: Publish version for the [${site.domain}] - status: ${response.status}`);
    } catch (error) {
      logger.log(error, 'ERROR');
    }
  }
}

async function deleteSite(site) {
  const url = endpoint.getDeleteSiteUrl(config, site);
  try {
      const response = await axios.delete(url);
      logger.log(`[${this.config.username}]: Delete site [${site.domain}] - status: ${response.status}`);
    } catch (error) {
      logger.log(error, 'ERROR');
    }
}

async function redesign(site) {
  const url = endpoint.getRedesignSiteUrl(config, site.id);
  const body = {design: 33, frontend: 34, backend: 33};
  try {
    const response = await axios.post(url, body);
    logger.log(`[${this.config.username}]: Redesign a site [${site.domain}] - status: ${response.status}`);
  } catch (error) {
    logger.log(error, 'ERROR');
  }
}


let data;
async function run() {
  const siteName = await createSite();
  let isMaxed = false;
  if (siteName === '') return;
  data = await getUserData();
  const site = data.sites.filter(site => site.domain === siteName);
  await publishVerison(site);
  await redesignSite(site);
  while(!isMaxed) {
    if (site.level < 15) {
      // calculate || wait logic
      await publishVerison(site);
    }
  }
  await deleteSite(site);
  logger.log(`[${this.config.username}]: Exp farm cycle ended.`);
}

function isNewVersionReady(site) {
  const isDesignReady = site.designValue === site.limit.design;
  const isBackendReady = site.backendValue === site.limit.backend;
  const isFrontendReady = site.frontendValue === site.limit.frontend;
  return isDesignReady && isBackendReady && isFrontendReady;
}

run();