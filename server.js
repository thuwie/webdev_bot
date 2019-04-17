const express = require('express');
const path = require('path');
const { CFRunner } = require('./cfRunner');

const app = express();

const runners = {};

app.get('/add', (req, res) => {
  const {
    userId, accessToken, connectionId, timeout,
  } = req.query;

  if (!userId || !accessToken || !connectionId) {
    res.status(400);
    res.send('not all properties are defined!');
    return;
  }

  const currConfig = {
    userId,
    accessToken,
    connectionId,
  };

  let currRunner = runners[userId];
  if (!currRunner) {
    currRunner = new CFRunner(currConfig);
  }

  runners[userId] = currRunner;
  currRunner.scheduleTasks(currConfig, timeout)
    .then(() => {
      res.send('Hello World!');
    })
    .catch((error) => {
      res.status(500);
      res.send(`Error! ${error}`);
    });
});

app.get('/info', (req, res) => {
  const configs = [];
  for (const config in runners) {
    if (runners.hasOwnProperty(config)) {
      configs.push(runners[config].getSafeConfigInfo());
    }
  }
  res.send(configs);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname }/pages/index.html`));
});

// init
const { constConfig } = require('./config');

constConfig.forEach((configFromDefaults) => {
  runners[configFromDefaults.id] = new CFRunner(configFromDefaults);
  runners[configFromDefaults.id].scheduleTasks(configFromDefaults, 300000);
});

app.listen(8080, () => {
  console.log('Started on port 8080!');
});
