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
  const siteName = `exp-${config.hiddenName}.free`;
  const body = {
    domain: siteName,
    domainzoneId: 1,
    engineId: 8, // first fast engine
    sitethemeId: 1,
    sitetypeId: 3
  };
  try {
    const response = await axios.post(url, body);
    logger.log(`[${config.username}]: Create site [${siteName}] - status: ${response.status}`);
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
      logger.log(`[${config.username}]: Publish version for the [${site.domain}] - status: ${response.status}`);
    } catch (error) {
      logger.log(error, 'ERROR');
    }
  }
}

async function deleteSite(site) {
  const url = endpoint.getDeleteSiteUrl(config, site);
  try {
      const response = await axios.delete(url);
      logger.log(`[${config.username}]: Delete site [${site.domain}] - status: ${response.status}`);
    } catch (error) {
      logger.log(error, 'ERROR');
    }
}

async function redesign(site) {
  const url = endpoint.getRedesignSiteUrl(config, site.id);
  const body = {design: 33, frontend: 34, backend: 33};
  try {
    const response = await axios.post(url, body);
    logger.log(`[${config.username}]: Redesign a site [${site.domain}] - status: ${response.status}`);
  } catch (error) {
    logger.log(error, 'ERROR');
  }
}

async function calculateWaitTime(site) {


}

async function setAssignees(workers, site) {
  const backendWorkers = workers
      .filter((worker) => {
        const {
          marketing, design, frontend, backend,
        } = worker;
        return backend >= marketing && backend >= design && backend >= frontend;
      });
  const frontendWorkers = workers
      .filter((worker) => {
        const {
          marketing, design, frontend, backend,
        } = worker;
        return frontend >= backend && frontend >= design && frontend >= marketing;
      });
  const designWorkers = workers
      .filter((worker) => {
        const {
          marketing, design, frontend, backend,
        } = worker;
        return design >= backend && design >= marketing && design >= frontend;
      });

  const filteredWorkers = [
    backendWorkers[0], 
    frontendWorkers[0],
    designWorkers[0]];

     filteredWorkers.forEach(async (worker, index) => {
      try {
      logger.log(`[${config.username}]: adding worker ${worker.name} to site ${site.domain}`);
      const pushUrl = endpoint.getSendWorkerToWork(config, site.id, (index+1));
      await axios.post(pushUrl, {
        workerIds: [worker.id],
      }); 
    } catch (error) {
      logger.log(error, 'ERROR');
    }

    });
}


let data;
async function run() {
  const siteName = await createSite();
  let isMaxed = false;
  let waiter = 1;
  if (siteName === '') return;
  data = await getUserData();
  const site = data.sites.filter(site => site.domain === siteName);
  
  await setAssignees(data.workers, site);
  await publishVerison(site);
  await redesignSite(site);
  while(!isMaxed) {
    if (site.level < 15) {
      utils.wait(waiter * 1000);
      // calculate || wait logic
      await publishVerison(site);
    } else {
      isMaxed = true;
    }

    waiter += 5;
  }
  await deleteSite(site);
  logger.log(`[${config.username}]: Exp farm cycle ended.`);
}

function isNewVersionReady(site) {
  const isDesignReady = site.designValue === site.limit.design;
  const isBackendReady = site.backendValue === site.limit.backend;
  const isFrontendReady = site.frontendValue === site.limit.frontend;
  return isDesignReady && isBackendReady && isFrontendReady;
}

run();