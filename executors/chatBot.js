const WebSocket = require('ws');
const { Config } = require('../bot_tasks/Config');
const utils = require('../utils/utils');

const RequestsExecutor = require('../bot_tasks/RequestsExecutor');

const { constConfigs } = require('../config.json');

const config = new Config(constConfigs[process.argv[2] || 0]);

let socketConnection;

async function sendMessage(text) {
  try {
    await RequestsExecutor.sendMessage(config, text);
  } catch (error) {
    console.log(error);
  }
}

async function handleInputMessage(text, username) {
  if (text.toLowerCase() === '?женя') {
    sendMessage(`${username}, Hello world!`);
    return;
  }
  if (text.toLowerCase() === '?бот') {
    await utils.sleep(5500);
    sendMessage(`${username}, Не слушай его, он всякую чушь несет`);
  }
}

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
    socketConnection.onmessage = (m) => {
      const message = JSON.parse(m.data);
      if (!message) {
        return;
      }
      // handle direct input messages
      if (message.target === 'globalchat' && message.action === 'add' && message.value.text) {
        handleInputMessage(message.value.text, message.value.username);
      }

      if (message.action === 'batch' && message.target === 'batch') {
        const batchInputMsgs = message.value.filter(v => v.target === 'globalchat' && v.action === 'add' && v.value.text);
        for (const msg of batchInputMsgs) {
          if (msg && msg.value && msg.value.text) {
            handleInputMessage(msg.value.text, msg.value.username);
          }
        }
      }
    };

    resolve();
  });
}

setSocketTunnel().then(() => {
  console.log('started!');
});
