const utils = require('./utils');

class APIService {
  getAuthUrl(config, ts = utils.getTs()) {
    return `${config.url}/users/${config.userId}/init?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // GET
  }

  getAdsPostUrl(config, siteId, ts = utils.getTs()) {
    return `${config.url}/ad_s/ad/${config.userId}/generateOffers/${siteId}/0?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // POST: api/ad_s/ad/USERID/generateOffers/SITEID/1?access_token=TOK&connectionId=CONID&ts=TS
  }

  getAdsDeleteUrl(config, advId, ts = utils.getTs()) {
    return `${config.url}/ad_s/${config.userId}/${advId}/delete?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // DELETE: api/ad_s/USERID/ADVID/delete?access_token=TOK&connectionId=CONID&ts=TS
  }

  getAdsEnableUrl(config, siteId, ts = utils.getTs()) {
    return `${config.url}/ad_s/${config.userId}/${siteId}/add?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // POST: api/ad_s/USERID/SITEID/add?access_token=TOK&connectionId=CONID&ts=TS
  }

  getAdsDisableUrl(config, advId, ts = utils.getTs()) {
    return `${config.url}/ad_s/${config.userId}/${advId}/cancel?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // DELETE: api/ad_s/USERID/ADVID/cancel?access_token=TOK&connectionId=conid&ts=TS
  }

  getPostSiteLinkUrl(config, targetSideId, postingSiteId, ts = utils.getTs()) {
    return `${config.url}/links/${config.userId}/${targetSideId}/${postingSiteId}/1?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // POST :
  }

  getPublishFreshContentUrl(config, siteId, contentId, ts = utils.getTs()) {
    return `${config.url}/content/${config.userId}/${siteId}/${contentId}?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // POST :
  }

  getDeleteSpamUrl(config, siteId, ts = utils.getTs()) {
    return `${config.url}/links/${config.userId}/${siteId}/spam?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // DELETE :
  }

  getPublishSiteVersionUrl(config, siteId, ts = utils.getTs()) {
    return `${config.url}/sites/${config.userId}/${siteId}/levelUp?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // POST :
  }

  getFinishWorkerTaskForSiteIdUrl(config, siteId, workerId, ts = utils.getTs()) {
    return `${config.url}/sites/${config.userId}/${siteId}/${workerId}?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
    // DELETE 
    // https://game.web-tycoon.com/api/sites/ USER_ID / SITE_ID / <WORKER ID> ?access_token=T&connectionId=C&ts=TS
  }

  // 4 is marketing
  // 3 is design
  // 2 is fronend
  // 1 backend
  getSendWorkerToWork(config, siteId, taskTypeId, ts = utils.getTs()) {
    return `${config.url}/sites/${config.userId}/${siteId}/${taskTypeId}/addTask?access_token=${config.accessToken}&connectionId=${config.connId}&ts=${ts}`;
  // https://game.web-tycoon.com/api/sites/USERID/SITEID/4/addTask?access_token=T&connectionId=C&ts=T
  // POST , body: { workersIds: [] }
  }
}

module.exports = {
  APIService: new APIService(),
};
