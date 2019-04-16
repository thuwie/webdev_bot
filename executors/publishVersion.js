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

function isNewVersionReady(site) {
	let isDesignReady = site.designValue === site.limit.design;
	let isBackendReady = site.backendValue === site.limit.backend;
	let isFrontendReady = site.frontendValue === site.limit.frontend;
	
	return isDesignReady && isBackendReady && isFrontendReady;
}

async function publishVersion(site) {
    const url = endpoint.getPublishSiteVersionUrl(config.url, config.userId, site.id, config.accessToken, config.connectionId, utils.getTs());
    try {
        const response = await axios.post(url);
        logger.log(`Publish version for the [${site.domain}] - status: ${response.status}`);
    } catch (error) {
        logger.log(error, 'ERROR');
    }
}

async function run() {
    try {
		let intervalId = setInterval(async () => {
			let body = await getUserData();
			
			body.sites.forEach(async (site) => {
				if (isNewVersionReady(site)) {
					await publishVersion(site);
				}
			});
		}, 1000 * 60 * 2);
    } catch (error) {
        logger.log(error.message);
    }
}

run();
