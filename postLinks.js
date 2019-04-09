const request = require('request');
const endpoint = require('./endpoint');
const utils = require('./utils');
const logger = require('./logger');
const config = require('./config.json');

/**
 * Get data from the API
 * @returns {Promise<any>}
 */
function getUserData() {
    return new Promise((resolve, reject) => {
        let body = '';
        let parsedBody = {};
        request.get(
            endpoint.getAuthUrl(config.url, config.userId, config.accessToken, config.connectionId, utils.getTs()))
            .on('response', function (response) {
            })
            .on('error', (err) => reject(err))
            .on('data', function (chunk) {
                body += chunk;

            })
            .on('end', () => {
                parsedBody = JSON.parse(body);
                return resolve(parsedBody);
            });
    });
}

const siteId = '5cac7b6c4be2846b86228de0';

async function postLink(site) {
    const url = endpoint.getPostSiteLinkUrl(config.url, config.userId, site.ad[0].siteId, siteId,config.accessToken, config.connectionId, utils.getTs());
    console.log(url);
    request.post(
        url)
        .on('response', (response) => {
            logger.log(`Generating link for the [${site.domain}] - status: ${response.statusCode}`)
        })
        .on('error', (err) => {
            throw(err);
        })

        .on('end', async () => {
            return true;
        });
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
