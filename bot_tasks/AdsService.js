const RequestsExecutor = require('./RequestsExecutor');

function tooOldBanner(site, ad, ctrRate) {
  return ad.status === 1
    && (ad.ctrBase + (ad.ctrVector * (Date.now() - 1000 * ad.startDate) / 3600000)) * (1 - site.sitespeed[site.sitespeed.length - 1].anno / 100) <= ctrRate;
}


async function handleAdBanners(config, userData) {
  const interestingSites = userData.sites.filter(s => !s.domain.startsWith('lvlup') && !s.domain.startsWith('exp-') && !s.domain.startsWith('grow-'));
  for (const site of interestingSites) {
    let isSearchingAd = userData.tasks.find(task => task.zone === 'searchAd' && task.siteId === site.id);

    const bannersToRemove = site.ad
      // importunity (=== annoyance) - 12 (green), 41 (yellow), 100 (red)
      .filter(ad => tooOldBanner(site, ad, 2.2) || (ad.adthemeId !== site.sitethemeId) || ad.importunity !== 41);

    for (const banner of bannersToRemove) {
      await RequestsExecutor.deleteAd(config, site, banner);
      // delete removed banner from local copy of site.ad (to not execute /init again)
      const bannerIndex = site.ad.findIndex(ad => ad.id === banner.id);
      site.ad.splice(bannerIndex, 1);
    }

    if (!isSearchingAd && (site.ad.length < site.adSlots)) {
      await RequestsExecutor.searchAd(config, site);
      isSearchingAd = true;
    }

    let countEnabledBanners = site.ad
      .filter(a => a.status === 1)
      .length;

    for (const banner of site.ad) {
      if (countEnabledBanners > 1) {
        break;
      }
      if (banner.status === 1) {
        continue;
      }
      await RequestsExecutor.enableAd(config, site, banner);
      banner.status = 1;
      countEnabledBanners += 1;
    }
  }
}

module.exports = {
  handleAdBanners,
};
