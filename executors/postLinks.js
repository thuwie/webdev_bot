const utils = require('../utils/utils');
const logger = require('../utils/logger');
const RequestsExecutor = require('../bot_tasks/RequestsExecutor');
const { Config } = require('../bot_tasks/Config');
const { constConfigs } = require('../config.json');

const config = new Config(constConfigs[process.argv[2] || 3]);
const siteId = process.argv[3];

let data;
let sites;

// CONFIG id then SITE id to publish on
async function refreshSiteData() {
  const response = await RequestsExecutor.auth(config);
  if (!response) {
    return errorHandler();
  }
  data = response.data;
  sites = data.sites;
  config.username = data.person.username;
  return false;
}


async function run() {
  try {
    await refreshSiteData();
    const N = sites.length;
    for (let i = 0; i < N; i++) {
      console.log('asd');
      const response = await RequestsExecutor.postSiteLinkUrl(config, sites[i].id, siteId);
      await utils.sleep(1500);
    }
  } catch (error) {
    logger.log(error.message);
  }
}

run();
