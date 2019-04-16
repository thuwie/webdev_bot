const express = require('express');
const path = require('path');
const {CFRunner} = require('./cfRunner');
const PORT = process.env.PORT || 5000;
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
    res.sendFile(path.join(__dirname+'/pages/index.html'));
});

app.listen(PORT, () => {
    console.log(`Started on port ${PORT}!`);
});
