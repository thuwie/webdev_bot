const request = require('request');
const endpoint = require('./endpoint');
const utils = require('./utils');
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
                // console.log(response.statusCode) // 200
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

function generateAdvertisment(site) {

    return new Promise((resolve, reject) => {
        request.post(
            endpoint.getAdsPostUrl(config.url, config.userId, site.ad[0].siteId, config.accessToken, config.connectionId, utils.getTs()))
            .on('response', (response) => {
                console.log(`Generating adv for the [${site.domain}] - status: ${response.statusCode}`)
            })
            .on('error', (err) => reject(err))
            .on('end', async () => resolve());
    });
}

function deleteAdvertisment(site) {
    new Promise((resolve, reject) => {
        request.delete(
            endpoint.getAdsDeleteUrl(config.url, config.userId, site.ad[2].id, config.accessToken, config.connectionId, utils.getTs()))
            .on('response', (response) => {
                console.log(`Deleting adv for the [${site.domain}] - status: ${response.statusCode}`)
            })
            .on('error', (err) => reject(err))
            .on('end', async () => {
                return resolve()
            });
    });
}
function enableAdvertisment(site, advNum) {
    return new Promise((resolve, reject) => {
        const reqBody = {
            headers: {'content-type': 'application/json;charset=utf-8'},
            url: endpoint.getAdsEnableUrl(config.url, config.userId, site.ad[advNum].siteId, config.accessToken, config.connectionId, utils.getTs()),
            body: {
                adId: site.ad[advNum].id
            },
            json: true
        };
        request.post(reqBody).on('response', (response) => {
            console.log(`Enable adv for the [${site.domain}] - status: ${response.statusCode}`)
        })
            .on('error', (err) => reject(err))
            .on('end', async () => resolve());
    });
}

function disableAdvertisment(site, advNum) {
    new Promise((resolve, reject) => {
        request.delete(
            endpoint.getAdsDisableUrl(config.url, config.userId, site.ad[advNum].id, config.accessToken, config.connectionId, utils.getTs()))
            .on('response', (response) => {
                console.log(`Disable adv for the [${site.domain}] - status: ${response.statusCode}`)
            })
            .on('error', (err) => reject(err))
            .on('end', async () => {
                return resolve()
            });
    });
}

async function disable() {
    try {
        let body = await getUserData();
        // console.log(body.sites[0]);
        await enableAdvertisment(body.sites[0], 0);
        await utils.sleep(5000);
        body = await getUserData();
        // console.log(body.sites[0].ad);
        await disableAdvertisment(body.sites[0], 0);
    } catch (e) {
        console.log(e);
    }
    //run();
 }
// async function process(site) {
//     let body = await getUserData();
//     //console.log(body.sites[0].ad[0]);
//     generateAdvertisment(site.ad[0]);
//     await utils.sleep(65000);
//     body = await getUserData();
//     // console.log(body.sites[0].ad);
//     deleteAdvertisment(site.ad[2]);
//     run();
// }
// run();
async function run() {
    let body = await getUserData();
    for (let i = 0; i < 39; i++) {
        generateAdvertisment(body.sites[i]);
    }
    await utils.sleep(65000);
    body = await getUserData();
    for (let i = 0; i < 39; i++) {
        deleteAdvertisment(body.sites[i]);
    }
    run();
}
// run();
disable();


