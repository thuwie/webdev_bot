const WebSocket = require('ws');
const EventEmitter = require('events');
const utils = require('../utils/utils');
const logger = require('../utils/logger');

const RequestsExecutor = require('../bot_tasks/RequestsExecutor');
const { Config } = require('../bot_tasks/Config');

const { constConfigs } = require('../config.json');

const config = new Config(constConfigs[process.argv[2] || 0]);

class Emitter extends EventEmitter {}
const emitter = new Emitter();

let data;
let sitename;
let socketConnection;
let site;
let publishTimestamp = utils.getTs();
let isLvlUpInProcess = false;
const expGeneratorSiteName = `exp-${config.hiddenName}.free`;
// 1. create site
// 2. redesign
// 3. wait for the socket to emit
// 4. lvlup site
// 5. run while version < 10
// 6. delete
// 7. start again

emitter.on('lvlup', async () => {
  if (isLvlUpInProcess) {
    // thanks god JS in not parallel and we can use such flags
    return;
  }
  isLvlUpInProcess = true;
  logger.log(`[${config.username}]: leveling up site ${sitename}, level ${site.level}`);
  await publishVerison(site);
  isLvlUpInProcess = false;
  if (site.level > 7) {
    await deleteSite(site);
    logger.log(`[${config.username}]: Exp farm cycle ended. Rest for the 10 seconds.`);
    await utils.sleep(5000);
    run();
  }
});

function setSocketTunnel() {
  return new Promise((resolve) => {
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
      if (!site) {
        // if site is not initizlized - ignore
        return;
      }
      const messageObject = JSON.parse(message.data);

      if (!messageObject.value || messageObject.target !== 'batch') return;
      const actions = messageObject.value || [];
      // value.action = 'readyForLevelUp'
      // value.message = 'sitename ready for the publication'

      const action = actions
        .find(event => event.target === 'notification' && event.value && event.value.action === 'readyForLevelUp' && event.value.siteId === site.id);
      if (action) {
        emitter.emit('lvlup');
      }
    };

    resolve();
  });
}

async function publishVerison(siteToDelete) {
  const newPublishTimestamp = utils.getTs();
  try {
    const response = await RequestsExecutor.publishVersion(config, siteToDelete);
    publishTimestamp = newPublishTimestamp;
    const newSiteLevel = response.data.shadoWs.value
      .find(v => v.target === 'site'
        && v.action === 'update'
        && v.id === site.id
        && v.value
        && v.value.hasOwnProperty('level')).value.level;

    siteToDelete.level = newSiteLevel;
    logger.log(`[${config.username}]: Publish version for the [${siteToDelete.domain}] - status: ${response.status}`);
  } catch (error) {
    if (newPublishTimestamp - publishTimestamp > 10000) {
      logger.log(error, 'ERROR');
    }
  }
}

async function errorHandler(error) {
  logger.log(error, 'ERROR');
  logger.log(`[${config.username}]: Exp farm cycle broken. Rest for the 10 seconds.`);
  if (site) {
    await deleteSite(site);
  }
  await utils.sleep(5000);
  run();
}

async function refreshSiteData() {
  const response = await RequestsExecutor.auth(config);
  if (!response) {
    return errorHandler();
  }
  data = response.data;
  config.username = data.person.username;
  site = data.sites.find(s => s.domain === expGeneratorSiteName);
  return false;
}

async function createSite() {
  const body = {
    domain: expGeneratorSiteName,
    domainzoneId: 1,
    engineId: 1, // 8 - first fast engine; 1 - second
    sitethemeId: 1,
    sitetypeId: 3,
  };
  try {
    const response = await RequestsExecutor.createSite(config, body);
    logger.log(`[${config.username}]: Create site [${expGeneratorSiteName}] - status: ${response.status}`);
    site = response.data;
    data.sites.push(site);
    await RequestsExecutor.paySite(config, site, 'domains');
    return site.domain;    
  } catch (error) {
    errorHandler(error);
  }
  return '';
}

async function deleteSite(siteToDelete) {
  try {
    const response = await RequestsExecutor.deleteSite(config, siteToDelete);
    site = null;
    logger.log(`[${config.username}]: Delete site [${siteToDelete.domain}] - status: ${response.status}`);
  } catch (error) {
    errorHandler(error);
  }
}

async function redesignSite(siteToRedesign) {
  const body = { params: { design: 33, frontend: 34, backend: 33 } };
  try {
    const response = await RequestsExecutor.redesignSite(config, siteToRedesign, body);
    logger.log(`[${config.username}]: Redesign a site [${siteToRedesign.domain}] - status: ${response.status}`);
  } catch (error) {
    errorHandler(error);
  }
}

async function setAssignees(workers, siteToWork) {
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

  for (let i = 0; i < filteredWorkers.length; i += 1) {
    const worker = filteredWorkers[i];
    try {
      await RequestsExecutor.sendWorkerToWork(config, siteToWork, (i + 1), worker);
    } catch (error) {
      errorHandler(error);
    }
  }
}

async function run() {
  await refreshSiteData();
  if (site) {
    await deleteSite(site);
  }
  sitename = await createSite();
  if (sitename === '') return;
  await redesignSite(site);
  await setAssignees(data.workers, site);
}
setSocketTunnel().then(() => {
  run();
});
