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

  runners[userId] = new CFRunner(currConfig);;
  runners[userId].scheduleTasks(currConfig, timeout)
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
  // res.send(runners);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname}/pages/index.html`));
});

// init
const { constConfigs } = require('./config.json');

for (const config of constConfigs) {
  runners[config.userId] = new CFRunner(config);
  runners[config.userId].scheduleTasks(config, 300000);
}

app.listen(8080, () => {
  console.log('Started on port 8080!');
});
