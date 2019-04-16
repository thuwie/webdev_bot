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
}

module.exports = {
  APIService
};
