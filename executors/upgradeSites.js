const WebSocket = require('ws');
const EventEmitter = require('events');
const utils = require('../utils/utils');
const logger = require('../utils/logger');

const RequestsExecutor = require('../bot_tasks/RequestsExecutor');
const { Config } = require('../bot_tasks/Config');
const { constConfigs } = require('../config.json');

const configId = process.env.CONFIG_ID || process.argv[2] || 3;
const config = new Config(constConfigs[configId]);

class Emitter extends EventEmitter {
}
const emitter = new Emitter();

const LEVEL_CAP = process.env.LEVEL_CAP || process.argv[3] || 15;
const redesignValues = { design: 50, frontend: 10, backend: 40 };

let data;
let sites;
let filteredWorkers;
let socketConnection;
let site;
let publishTimestamp = utils.getTs();
let isLvlUpInProcess = false;

emitter.on('lvlup', async () => {
  if (isLvlUpInProcess) {
    return;
  }
  isLvlUpInProcess = true;
  logger.log(`[${config.username}]: leveling up site ${site.domain}, level ${site.level}`);
  await publishVerison(site);
  isLvlUpInProcess = false;
  if (site.level > LEVEL_CAP - 1) {
    logger.log(`[${config.username}]: ${site.domain} upgrades ended. Rest for the 10 seconds.`);
    for (let i = 0; i < 3; i++) {
      await getFromWork(filteredWorkers[i], site);
      await utils.sleep(1000);
    }
    sites.shift();
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
  logger.log(`[${config.username}]: Exp upgrade sytes cycle broken. Rest for the 10 seconds.`);
  if (site) {
    // await deleteSite(site);
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
  sites = data.sites.filter(site => site.level < LEVEL_CAP);
  config.username = data.person.username;
  return false;
}

async function redesignSite(siteToRedesign) {
  const body = {params: redesignValues};
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

  filteredWorkers = [
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

async function getFromWork(worker, site) {
  try {
    logger.log(`[${config.username}]: getting ${worker.name} back from task on site ${site.domain}`);
    await RequestsExecutor.finishWorkerTask(config, site, worker);
    await utils.sleep(1000);
  } catch (error) {
    logger.log(`[${config.username}]: failed to get ${worker.name} back from task on site ${site.domain}`);
    logger.log(error, 'ERROR');
  }
}

async function prepations() {
  await refreshSiteData();
  await run();
}

async function run() {
  const siteToWork = sites[0];
  site = siteToWork;
  console.log(siteToWork.kfParam);
  if (!siteToWork.kfParam.custom) {
    await redesignSite(siteToWork);
  }
  await setAssignees(data.workers, siteToWork);
}

setSocketTunnel().then(() => {
  prepations();
});
