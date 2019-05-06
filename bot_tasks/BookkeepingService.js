const utils = require('../utils/utils');
const RequestsExecutor = require('./RequestsExecutor');

async function payThings(config, userData) {
  const currentTime = utils.getTime();
  for (const site of userData.sites) {
    if (site.hostingPaidTill && site.hostingPaidTill - currentTime < 79200) {
      await RequestsExecutor.paySite(config, site, 'hostings');
    }
    if (site.domainTill && site.domainTill - currentTime < 260000) {
      await RequestsExecutor.paySite(config, site, 'domains');
    }
  }

  for (const worker of userData.workers) {
    if (worker.paidTill && worker.paidTill - currentTime < 79200) {
      await RequestsExecutor.payWorker(config, worker);
    }
  }
}

module.exports = {
  payThings,
};
