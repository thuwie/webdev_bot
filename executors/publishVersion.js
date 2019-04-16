const axios = require('axios');
const endpoint = require('../utils/APIService').APIService;
const utils = require('../utils/utils');
const logger = require('../utils/logger');
const config = require('../config.json');

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

function isNewVersionReady(site) {
  const isDesignReady = site.designValue === site.limit.design;
  const isBackendReady = site.backendValue === site.limit.backend;
  const isFrontendReady = site.frontendValue === site.limit.frontend;

  return isDesignReady && isBackendReady && isFrontendReady;
}

async function publishVersion(site) {
  const url = endpoint.getPublishSiteVersionUrl(config, site.id);
  try {
    const response = await axios.post(url);
    logger.log(`Publish version for the [${site.domain}] - status: ${response.status}`);
  } catch (error) {
    logger.log(error, 'ERROR');
  }
}

async function run() {
  try {
    const intervalId = setInterval(async () => {
      const body = await getUserData();

      body.sites.forEach(async (site) => {
        if (isNewVersionReady(site)) {
          await publishVersion(site);
        }
      });
    }, 1000 * 60 * 2);
  } catch (error) {
    logger.log(error.message);
  }
}

run();
