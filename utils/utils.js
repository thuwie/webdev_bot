const endpoint = require('./endpoint');
const config = require('../config.json');
const request = require('request');

module.exports = {
    getTs: function getTs() {
        return new Date().getTime();
    },
    sleep: function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    getSiteObj: function getSiteObj(userData, opt) {
        return userData.sites.filter(obj => {
            return obj[opt.field] == opt.property;
        })
    },
    compareObj: function (old, update) {
        const differences = [];
        const ignore = ['startDate', 'money'];
        old.forEach(function (a, i) {
            Object.keys(a).forEach(function (k) {
                if (a[k] !== update[i][k] && ignore.indexOf(k) === -1) {
                    differences.push({ index: i, key: k, oldValue: a[k], newValue: update[i][k] });
                }
            });
        });
        return differences;
    },

    /**
     * Just a wrapper to send POST request
     * @returns {Promise<any>}
     */
    sendPostRequest(url) {
        return new Promise((resolve, reject) => {
            let body = '';
            let parsedBody = {};
            request.post(url)
                .on('response', function (response) { })
                .on('error', (err) => reject(err))
                .on('data', function (chunk) {
                    body += chunk;
                })
                .on('end', () => {
                    parsedBody = JSON.parse(body);
                    return resolve(parsedBody);
                });
        });
    },

    /**
     * Just a wrapper to send DELETE request
     * @returns {Promise<any>}
     * 
     * 
     * P.S. wtf, can we set http method using parameter?
     */
    sendDeleteRequest(url) {
        return new Promise((resolve, reject) => {
            let body = '';
            let parsedBody = {};
            request.delete(url)
                .on('response', function (response) { })
                .on('error', (err) => reject(err))
                .on('data', function (chunk) {
                    body += chunk;
                })
                .on('end', () => {
                    parsedBody = JSON.parse(body);
                    return resolve(parsedBody);
                });
        });
    },

    /**
     * Get data from the API
     * @returns {Promise<any>}
     */
    getUserData() {
        return new Promise((resolve, reject) => {
            let body = '';
            let parsedBody = {};
            request.get(
                endpoint.getAuthUrl(config.url, config.userId, config.accessToken, config.connectionId, this.getTs())
            )
                .on('response', function (response) { })
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
};