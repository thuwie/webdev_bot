const endpoint = require('./endpoint');
const utils = require('./utils');
const logger = require('./logger');
const config = require('./config.json');

class CFRunner {
    constructor(config) {
        this.config = config;
    }

    async refresh() {
        this.body = await utils.getUserData();
    }

    async publishContent() {
        const unlimitedSites = this.body.sites.filter(site => {
            const sitespeed = site.sitespeed;
            return Array.isArray(sitespeed) && sitespeed[sitespeed.length - 1] && !sitespeed[sitespeed.length - 1].limited;
        });
        const sitesWithoutBuff = unlimitedSites.filter(site => {
            const buffs = site.buffs;
            return Array.isArray(buffs) && buffs.filter(buff => {
                return buff.object === "content"
            }).length === 0;
        });
        const sitesWithoutBuffButWithStoredContent = sitesWithoutBuff.filter(site => {
            const contents = site.content;
            return contents.filter(content => content.status === 1).length > 0;
        })

        for (const site of sitesWithoutBuffButWithStoredContent) {
            const lastContent = site.content.find(content => {
                return content.status === 2
            });
            let interestedContent = site.content.find(content => {
                return content.status === 1 && content.contenttypeId !== lastContent.contenttypeId;
            });
            if (!interestedContent) {
                interestedContent = site.content.find(content => {
                    return content.status === 1;
                });
            }
            logger.log(`${new Date()}: processing site ${site.domain}`);
            try {
                const url = endpoint.getPublishFreshContentUrl(this.config.url, this.config.userId, site.id, interestedContent.id, this.config.accessToken, this.config.connectionId, utils.getTs())
                const response = await utils.sendPostRequest(url);
                if (response.error) {
                    logger.log(`Error: ${response.error.statusCode}, ${response.error.message}`);
                }
                await utils.sleep(1500);
            } catch (error) {
                logger.log(error.message);
            }
        };
        return;
    }

    async deleteSpam() {
        for (const site of this.body.sites) {
            const containsSpam = Array.isArray(site.links) && site.links.find(link => link.type === 2 && site.id === link.fromSiteId);
            if (!containsSpam) {
                continue;
            }
            try {
                logger.log(`${new Date()}: Deleting spam from site ${site.domain}`);
                const url = endpoint.getDeleteSpamUrl(this.config.url, this.config.userId, site.id, this.config.accessToken, this.config.connectionId, utils.getTs())
                const response = await utils.sendDeleteRequest(url);
                if (response.error) {
                    logger.log(`Error: ${response.error.statusCode}, ${response.error.message}`);
                }
                await utils.sleep(1500);
            } catch (error) {
                logger.log(error.message);
            }
        };
        return;
    }

}

async function run() {
    const runner = new CFRunner(config);
    while (true) {
        await runner.refresh();
        await runner.publishContent();
        await runner.deleteSpam();
        await utils.sleep(1000 * 60 * 5);
    }
}

const args = process.argv.slice(2);
config.userId = args[0] || config.userId;
config.accessToken = args[1] || config.accessToken;
config.connectionId = args[2] || config.connectionId;

run().then(() => { console.log('Finished'); })
    .catch(err => { console.log(err); });
