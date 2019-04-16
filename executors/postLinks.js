const request = require('request');
const endpoint = require('../utils/endpoint');
const utils = require('../utils/utils');
const logger = require('../utils/logger');
const config = require('../config.json');
const axios = require('axios');

/**
 * Get data from the API
 * @returns {Promise<any>}
 */
async function getUserData() {
    const url = endpoint.getAuthUrl(config.url, config.userId, config.accessToken, config.connectionId, utils.getTs());
    try {
        const parsedBody = await axios.get(url);
        return parsedBody.data;
    } catch (error) {
        logger.log(error, 'ERROR');
    }
}

const args = process.argv.slice(2);
console.log(args[0]);
const siteId = args[0];

async function postLink(site) {
    const url = endpoint.getPostSiteLinkUrl(config.url, config.userId, site.ad[0].siteId, siteId, config.accessToken, config.connectionId, utils.getTs());
    try {
        const response = await axios.post(url);
        logger.log(`Post link for the [${site.domain}] - status: ${response.status}`);
    } catch (error) {
        logger.log(error, 'ERROR');
    }
}

async function run() {
    try {
        let body = await getUserData();
        const N = body.sites.length;
        for (let i = 0; i < N; i++) {
            await postLink(body.sites[i]);
            await utils.sleep(1500);
        }
    } catch (error) {
        logger.log(error.message);
    }
}

run();
