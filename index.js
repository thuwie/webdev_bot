const request = require('request');
const endpoint = require('./utils/endpoint');
const utils = require('./utils/utils');
const logger = require('./logger');
const config = require('./config.json');

/**
 * Get data from the API
 * @returns {Promise<any>}
 */
const ignore = [
    "gearbeast.com", "igrozilla.com", "scihub.edu", "pulse.free", "habr.edu", "flickr.com",
    "imgur.net", "vock.com", "venuce.free", "spotik.com", "raspberry.com", "ifmo.edu", "cloud.com",
    "funme.free", "lostlife.free"
];

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

/**
 * Creates new adv (for now - 1st lvl)
 * @param site object
 * @returns {Promise<any>}
 */
async function generateAdvertisment(site) {
    if (ignore.indexOf(site.domain) === -1) {
        request.post(
            endpoint.getAdsPostUrl(config.url, config.userId, site.ad[0].siteId, config.accessToken, config.connectionId, utils.getTs()))
            .on('response', (response) => {
                logger.log(`Generating adv for the [${site.domain}] - status: ${response.statusCode}`)
            })
            .on('error', (err) => {
                throw(err);
            })

            .on('end', async () => {
                return true;
            });
    }
}

/**
 * Deletes last adv ( site.ad[2].is - controller)
 * @param site site object
 */
function deleteAdvertisment(site) {
    if (ignore.indexOf(site.domain) === -1) {
        request.delete(
            endpoint.getAdsDeleteUrl(config.url, config.userId, site.ad[2].id, config.accessToken, config.connectionId, utils.getTs()))
            .on('response', (response) => {
                logger.log(`Deleting adv for the [${site.domain}] - status: ${response.statusCode}`)
            })
            .on('error', (err) => {
                throw (err)
            })
            .on('end', async () => {
                return true;
            });
    }
}

/**
 * turns on pointed adv
 * @param site object
 * @param advNum
 * @returns {Promise<any>}
 */
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
            logger.log(`Enable adv for the [${site.domain}] - status: ${response.statusCode}`)
        })
            .on('error', (err) => reject(err))
            .on('end', async () => resolve());
    });
}

/**
 * disables pointed adv
 * @param site
 * @param advNum
 */
function disableAdvertisment(site, advNum) {
    new Promise((resolve, reject) => {
        request.delete(
            endpoint.getAdsDisableUrl(config.url, config.userId, site.ad[advNum].id, config.accessToken, config.connectionId, utils.getTs()))
            .on('response', (response) => {
                logger.log(`Disable adv for the [${site.domain}] - status: ${response.statusCode}`)
            })
            .on('error', (err) => reject(err))
            .on('end', async () => {
                return resolve()
            });
    });
}

/**
 * raw example of the enabl-disabl
 * @returns {Promise<void>}
 */
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
        logger.log(e.message, 'ERROR');
    }
}

// disable();

/**
 * Recursive! raw example of the create-delete adv for the first site.
 * @param site
 * @returns {Promise<void>}
 */
async function process(site) {
    let body = await getUserData();
    generateAdvertisment(site.ad[0]);
    await utils.sleep(65000);
    body = await getUserData();
    deleteAdvertisment(site.ad[2]);
    run();
}

// process();

/**
 * Run through N sites to generate and the delete 3rd place adv. 1st lvl.
 * @returns {Promise<void>}
 */
async function run() {

    try {
        let body = await getUserData();
        const N = body.sites.length;
        for (let i = 0; i < N; i++) {
            await generateAdvertisment(body.sites[i]);
        }
        await utils.sleep(65000);
        body = await getUserData();
        for (let i = 0; i < N; i++) {
            await deleteAdvertisment(body.sites[i]);
        }
    } catch (error) {
        logger.error(error.message);
    }
    run();
}

//run();

async function getData(opt) {
    try {
        let body = await getUserData();
        let objArr = utils.getSiteObj(body, opt);
        return objArr[0];
    } catch (error) {
        logger.log(error.message);
    }
}

let lastCtrBase = 0;
let old = [{}, {}, {}];

async function manipulateData() {
    const obj = await getData({field: 'domain', property: 'moto.free'});
    let update = obj['ad'];
    let diffs = [];
    //logger.log(JSON.stringify(obj.ad[2]));
    // logger.log("Site money: " + JSON.stringify(obj.sitespeed[obj.sitespeed.length-1].money));

    diffs = utils.compareObj(old, update);
    diffs.forEach(item => {
        console.log(item);
    });
    await utils.sleep(5000);

    old = update;
    //display ads info
    /*obj['ad'].forEach((val, index) => {
       logger.log(index);
       console.log('CPC:' + val.cpc);
       console.log('CtrBase: ' + val.ctrBase);
       console.log('Money: ' + val.money);

   });*/

    //ctr differences for [0] only
    /*
    const ctrBase = obj['ad'][0].ctrBase;
    const diff = lastCtrBase - ctrBase;
    logger.log('Current ctrBase: ' + ctrBase);
    logger.log('Difference between ctrBases: ' + diff);
    lastCtrBase = ctrBase;
    */

    //timestamp
    //logger.log(new Date(obj.sitespeed[obj.sitespeed.length-1].ts).toLocaleString());

logger.log('Breakdown________________');
    manipulateData();
}

manipulateData();

//site.sitespeed[last index].money
//JSON.stringify(obj.sitespeed[obj.sitespeed.length-1])

// 13$ = 240
// 0 = 252
// 1.85 = 253

