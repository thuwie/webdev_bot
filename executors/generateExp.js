const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');
const endpoint = require('../utils/APIService').APIService;
const utils = require('../utils/utils');
const logger = require('../utils/logger');

const { constConfigs } = require('../config.json');

const config = constConfigs[process.argv[2] || 0];

class Emitter extends EventEmitter {}
const emitter = new Emitter();

let data;
let sitename;
let socketConnection;
let site;
let publishTimestamp = utils.getTs();

// 1. create site
// 2. redesign
// 3. wait for the socket to emit
// 4. lvlup site
// 5. run while version <15
// 6. delete
// 7. start again

emitter.on('lvlup', async () => {
  if (site.level < 15) {
    logger.log(`[${config.username}]: leveling up site ${sitename}, level ${site.level}`);
    await utils.sleep(1000);
    await publishVerison(site);
  } else {
    await publishVerison(site);
    await deleteSite(site);
    logger.log(`[${config.username}]: Exp farm cycle ended. Rest for the 10 seconds.`);
    await utils.sleep(10000);
    run();
  }
});

async function getUserData() {
  const url = endpoint.getAuthUrl(config);
  try {
    const parsedBody = await axios.get(url);
    return parsedBody.data;
  } catch (error) {
    logger.log(error, 'ERROR');
  }
}

function setSocketTunnel() {
  socketConnection = new WebSocket(config.socketUrl);
  const socketLogin = `{"target": "login","action": "add","value": "${config.socketLogin}"}`;
  socketConnection.onopen = () => {
    console.log('open');
    socketConnection.send(socketLogin);
  };
  socketConnection.onerror = (error) => {
    console.log(`WebSocket error: ${error}`);
  };
  socketConnection.onmessage = (message) => {
    let actions = [];
    const messageObject = JSON.parse(message.data);

    if (!messageObject.value) return;
    if (messageObject.target === 'batch') actions = messageObject.value;
    // value.action = 'readyForLevelUp'
    // value.message = 'sitename ready for the publication'

    const action = actions.filter(action => action.value.action === 'readyForLevelUp' && action.value.message.indexOf(sitename !== -1));
    if (action.length !== 0) {
      emitter.emit('lvlup');
    }
  };
}

async function createSite() {
  const url = endpoint.getCreateSiteUrl(config);
  const siteName = `exp-${config.hiddenName}.free`;
  const body = {
    domain: siteName,
    domainzoneId: 1,
    engineId: 1, // 8 - first fast engine; 1 - second
    sitethemeId: 1,
    sitetypeId: 3,
  };
  try {
    const response = await axios.post(url, body);
    logger.log(`[${config.username}]: Create site [${siteName}] - status: ${response.status}`);
    await utils.sleep(500);
    return siteName;
  } catch (error) {
    errorHandler(error);
  }
}

async function publishVerison(site) {
  const url = endpoint.getPublishSiteVersionUrl(config, site.id);
  const newPublishTimestamp = utils.getTs();
  try {
    const response = await axios.post(url);
    publishTimestamp = newPublishTimestamp;
    await utils.sleep(1000);
    await refreshSiteData();
    logger.log(`[${config.username}]: Publish version for the [${site.domain}] - status: ${response.status}`);
  } catch (error) {
    if (newPublishTimestamp - publishTimestamp > 10000) {
      logger.log(error, 'ERROR');
    }
  }
}

async function deleteSite(site) {
  const url = endpoint.getDeleteSiteUrl(config, site.id);
  try {
    const response = await axios.delete(url);
    logger.log(`[${config.username}]: Delete site [${site.domain}] - status: ${response.status}`);
  } catch (error) {
    errorHandler(error);
  }
}

async function redesignSite(site) {
  const url = endpoint.getRedesignSiteUrl(config, site.id);
  const body = { params: { design: 33, frontend: 34, backend: 33 } };
  try {
    const response = await axios.post(url, body);
    logger.log(`[${config.username}]: Redesign a site [${site.domain}] - status: ${response.status}`);
    await utils.sleep(1000);
  } catch (error) {
    errorHandler(error);
  }
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
    designWorkers[0],
  ];


  for (let i = 0; i < filteredWorkers.length; i++) {
    const worker = filteredWorkers[i];
    try {
      logger.log(`[${config.username}]: adding worker ${worker.name} to site ${site.domain}`);
      const pushUrl = endpoint.getSendWorkerToWork(config, site.id, (i + 1));
      await axios.post(pushUrl, {
        workerIds: [worker.id],
      });
      await utils.sleep(1000);
    } catch (error) {
      errorHandler(error);
    }
  }
}

async function refreshSiteData() {
  data = await getUserData();
  const filteredSite = data.sites.filter(site => site.domain === sitename);
  site = filteredSite[0];
}

async function errorHandler(error) {
  logger.log(error, 'ERROR');
  logger.log(`[${config.username}]: Exp farm cycle broken. Rest for the 10 seconds.`);
  await deleteSite(site);
  await utils.sleep(10000);
  run();
}

async function run() {
  sitename = await createSite();
  if (sitename === '') return;
  await refreshSiteData();
  await redesignSite(site);
  await utils.sleep(1500);
  await setAssignees(data.workers, site);
}
setSocketTunnel();
run();
