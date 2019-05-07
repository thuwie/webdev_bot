const RequestsExecutor = require('./RequestsExecutor');

function tooOldBanner(site, ad, ctrRate) {
  return ad.status === 1
    && (ad.ctrBase + (ad.ctrVector * (Date.now() - 1000 * ad.startDate) / 3600000)) * (1 - site.sitespeed[site.sitespeed.length - 1].anno / 100) <= ctrRate;
}


async function handleAdBanners(config, userData) {
  const interestingSites = userData.sites.filter(s => !s.domain.startsWith('lvlup') && !s.domain.startsWith('exp-'));
  for (const site of interestingSites) {
    console.log(`handling site ${site.domain}`);
    const isSearchingAd = userData.tasks.find(task => task.zone === 'searchAd' && task.siteId === site.id);

    const bannersToRemove = site.ad
      .filter(ad => tooOldBanner(site, ad, 2) || (ad.adthemeId !== site.sitethemeId));

    for (const banner of bannersToRemove) {
      const response = await RequestsExecutor.deleteAd(config, site, banner);
      const newAnno = response.shadoWs.value.find(v => v.target === 'site' && v.action === 'update' && v.value && v.value.hasOwnProperty('anno')).value.anno;
      site.anno = newAnno;
      const bannerIndex = site.ad.findIndex(ad => ad.id === banner.id);
      site.ad.splice(bannerIndex, 1);
    }

    if (!isSearchingAd && (site.ad.length < site.adSlots)) {
      await RequestsExecutor.searchAd(config, site);
    }

    let iteratedIndex = -1;
    while (site.anno < 30) {
      if (iteratedIndex + 1 >= site.ad.length) {
        break;
      }

      for (let i = iteratedIndex + 1; i < site.ad.length; i += 1) {
        if (site.ad[i].status === 0) {
          iteratedIndex = i;
          break;
        }
      }

      const nextDisabledBanner = site.ad[iteratedIndex];
      if (!nextDisabledBanner) {
        break;
      }

      const response = await RequestsExecutor.enableAd(config, site, nextDisabledBanner);
      let newAnno = response.shadoWs.value.find(v => v.target === 'site' && v.action === 'update' && v.value && v.value.hasOwnProperty('anno')).value.anno;
      nextDisabledBanner.status = 1;
      if (newAnno > 45) {
        // too big new annoyance. lets disable it
        const delResponse = await RequestsExecutor.disableAd(config, site, nextDisabledBanner);
        newAnno = delResponse.shadoWs.value.find(v => v.target === 'site' && v.action === 'update' && v.value && v.value.hasOwnProperty('anno')).value.anno;
        nextDisabledBanner.status = 0;
      }
      site.anno = newAnno;
    }
  }
}

module.exports = {
  handleAdBanners,
};
