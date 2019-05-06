const RequestsExecutor = require('./RequestsExecutor');

/**
 *
 * @param {Config} config
 * @param userData
 * @returns {Promise<void>}
 */
async function publishContent(config, userData) {
  const sitesWithoutBuff = userData.sites.filter((site) => {
    const { buffs } = site;
    return Array.isArray(buffs) && buffs.filter(buff => buff.object === 'content').length === 0;
  });
  const sitesWithoutBuffButWithStoredContent = sitesWithoutBuff.filter((site) => {
    const contents = site.content;
    return contents.filter(content => content.status === 1).length > 0;
  });

  for (const site of sitesWithoutBuffButWithStoredContent) {
    const lastContent = site.content.find(content => content.status === 2);
    let interestedContent = site.content.find(content => content.status === 1);

    if (lastContent) {
      const goodPotentialContent = site.content
        .find(content => content.status === 1 && content.contenttypeId !== lastContent.contenttypeId);

      if (goodPotentialContent) {
        interestedContent = goodPotentialContent;
      }
    }

    await RequestsExecutor.publishContent(config, site, interestedContent.id);
  }
}

/**
 *
 * @param {Config} config
 * @param userData
 * @returns {Promise<void>}
 */
async function deleteSpam(config, userData) {
  for (const site of userData.sites) {
    const containsSpam = Array.isArray(site.links)
      && site.links.find(link => link.type === 2 && site.id === link.fromSiteId);
    if (!containsSpam) {
      continue;
    }
    await RequestsExecutor.deleteSpam(config, site);
  }
}

function isNewVersionReady(site) {
  const isDesignReady = site.designValue === site.limit.design;
  const isBackendReady = site.backendValue === site.limit.backend;
  const isFrontendReady = site.frontendValue === site.limit.frontend;
  return isDesignReady && isBackendReady && isFrontendReady;
}

function allowedToUpdateVersion(config, site) {
  return (config.lvlUp && config.lvlUp.indexOf(site.domain) >= 0) || site.domain.startsWith('lvlup');
}
/**
 *
 * @param {Config} config
 * @param userData
 * @returns {Promise<void>}
 */
async function publishVersions(config, userData) {
  for (const site of userData.sites) {
    if (isNewVersionReady(site) && allowedToUpdateVersion(config, site)) {
      await RequestsExecutor.publishVersion(config, site);
    }
  }
}

module.exports = {
  publishContent,
  deleteSpam,
  publishVersions,
};
