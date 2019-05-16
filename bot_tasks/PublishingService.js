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
    // lets take any first
    let contentToPublish = site.content.find(content => content.status === 1);

    if (lastContent) {
      // then lets try to find a content with "no duplications" and override contentToPublish if it exists
      const normalContent = site.content
        .find(content => content.status === 1 && content.contenttypeId !== lastContent.contenttypeId);

      if (normalContent) {
        contentToPublish = normalContent;
      }

      // then find ideal content (with boost from comments)
      const interstedPotentialContentType = userData.siteOptions.content.relation[site.sitetypeId].find(r => r.contenttypeId === lastContent.contenttypeId);

      if (interstedPotentialContentType) {
        const intrestedContent = site.content.find(c => c.status === 1 && c.contenttypeId === interstedPotentialContentType.contenttypeIdBoost);
        if (intrestedContent) {
          contentToPublish = intrestedContent;
        }
      }
    }

    await RequestsExecutor.publishContent(config, site, contentToPublish.id);
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
