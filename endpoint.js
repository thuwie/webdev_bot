module.exports = {
    getAuthUrl: function (url, userId, accessToken, connId, ts) {
        return `${url}/users/${userId}/init?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
    },
    getAdsPostUrl: function (url, userId, siteId, accessToken, connId, ts) {
        return `${url}/ad_s/ad/${userId}/generateOffers/${siteId}/0?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
        //POST: api/ad_s/ad/USERID/generateOffers/SITEID/1?access_token=TOK&connectionId=CONID&ts=TS
    },
    getAdsDeleteUrl: function (url, userId, advId, accessToken, connId, ts) {
        return `${url}/ad_s/${userId}/${advId}/delete?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
        //DELETE: api/ad_s/USERID/ADVID/delete?access_token=TOK&connectionId=CONID&ts=TS
    },
    getAdsEnableUrl: function (url, userId, siteId, accessToken, connId, ts) {
        return `${url}/ad_s/${userId}/${siteId}/add?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
        //POST: api/ad_s/USERID/SITEID/add?access_token=TOK&connectionId=CONID&ts=TS
    },
    getAdsDisableUrl: function (url, userId, advId, accessToken, connId, ts) {
        return `${url}/ad_s/${userId}/${advId}/cancel?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
        //DELETE: api/ad_s/USERID/ADVID/cancel?access_token=TOK&connectionId=conid&ts=TS
    },
    getPostSiteLinkUrl: function(url, userId, targetSideId, postingSiteId, accessToken, connId, ts) {
        return `${url}/links/${userId}/${targetSideId}/${postingSiteId}/1?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
        //POST :
    },
    getPublishFreshContentUrl: function(url, userId, siteId, contentId, accessToken, connId, ts) {        
        return `${url}/content/${userId}/${siteId}/${contentId}?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
        //POST :
    },
    getDeleteSpamUrl: function(url, userId, siteId, accessToken, connId, ts) {        
        return `${url}/links/${userId}/${siteId}/spam?access_token=${accessToken}&connectionId=${connId}&ts=${ts}`;
        // DELETE :
    }
};