const RequestsExecutor = require('./RequestsExecutor');

function tooOldBanner(site, ad, ctrRate) {
  return ad.status === 1
    && (ad.ctrBase + (ad.ctrVector * (Date.now() - 1000 * ad.startDate) / 3600000)) * (1 - site.sitespeed[site.sitespeed.length - 1].anno / 100) <= ctrRate;
}


async function handleAdBanners(config, userData) {
  const interestingSites = userData.sites.filter(s => !s.domain.startsWith('lvlup') && !s.domain.startsWith('exp-'));
  for (const site of interestingSites) {
    let isSearchingAd = userData.tasks.find(task => task.zone === 'searchAd' && task.siteId === site.id);

    const bannersToRemove = site.ad
      // importunity (=== annoyance) - 12 (green), 41 (yellow), 100 (red)
      .filter(ad => tooOldBanner(site, ad, 2) || (ad.adthemeId !== site.sitethemeId) || ad.importunity < 41);

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

    const enabledBanners = site.ad
      .filter(a => a.status === 1);

    let totalEnabledImportunity = enabledBanners
      .reduce((a1, a2) => a1 + a2.importunity, 0);

    let countEnabledBanners = enabledBanners.length;

    for (const banner of site.ad) {
      if (totalEnabledImportunity > 100 || countEnabledBanners > 1) {
        break;
      }
      if (banner.status === 1) {
        continue;
      }

      // if it's not 3+3
      if (banner.importunity + totalEnabledImportunity < 200) {
        await RequestsExecutor.enableAd(config, site, banner);
        banner.status = 1;
        totalEnabledImportunity += banner.importunity;
        countEnabledBanners += 1;
      }
    }

    // go through banners again and delete if all have the same type
    const countOfYellowBanners = site.ad.filter(a => a.importunity === 41);

    if ((countOfYellowBanners === 3 || countOfYellowBanners === 0) && !isSearchingAd && site.ad.length === 3) {
      const disabledBanner = site.ad.find(a => a.status !== 1);
      await RequestsExecutor.deleteAd(config, site, disabledBanner);
    }
  }
}

module.exports = {
  handleAdBanners,
};
