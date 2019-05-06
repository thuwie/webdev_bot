const logger = require('../utils/logger');
const RequestsExecutor = require('./RequestsExecutor');

/**
 *
 * @param {Config} config
 * @param sitesWithFreePlaceForContentWithoutWorkers
 * @param worker
 * @returns {Promise<void>}
 */
async function goToWork(config, sitesWithFreePlaceForContentWithoutWorkers, worker) {
  const destSite = sitesWithFreePlaceForContentWithoutWorkers[0];

  if (!destSite) {
    logger.log(`[${config.username}]: no sites with free slots for work left! ${worker.name} goes to vacation`);
    await RequestsExecutor.sendWorkerToRest(config, worker);
    return;
  }

  await RequestsExecutor.sendWorkerToWork(config, destSite, 4, worker);
  // remove first element from array if everything is ok
  sitesWithFreePlaceForContentWithoutWorkers.shift();
}

/**
 *
 * @param {Config} config
 * @param sitesWithFreePlaceForContentWithoutWorkers
 * @param worker
 * @returns {Promise<void>}
 */
async function goToWorkOrRest(config, sitesWithFreePlaceForContentWithoutWorkers, worker) {
  if (worker.progress.energy < 20) {
    await RequestsExecutor.sendWorkerToRest(config, worker);
  } else {
    await goToWork(config, sitesWithFreePlaceForContentWithoutWorkers, worker);
  }
}

function isSiteNeedsNewContent(site, tasks) {
  const taskForSite = tasks.find(task => task.scope === 'marketing' && (task.siteId === site.id));
  return site.content.filter(content => content.status === 1).length < 4
    && taskForSite === undefined
    && !site.domain.startsWith('lvlup') && !site.domain.startsWith('exp-')
    && site.level > 0;
}

function filterContentMakers(workers) {
  return workers
    .filter((worker) => {
      const {
        marketing, design, frontend, backend,
      } = worker;
      return marketing >= backend && marketing >= design && marketing >= frontend;
    });
}

/**
 *
 * @param {Config} config
 * @param userData
 * @returns {Promise<void>}
 */
async function workBitches(config, userData) {
  const {
    sites, tasks, workers,
  } = userData;

  const sitesWithFreePlaceForContentWithoutWorkers = sites
    .filter(site => isSiteNeedsNewContent(site, tasks))
    .sort((site1, site2) => site1.content.length - site2.content.length);

  const marketingWorkers = filterContentMakers(workers);

  for (const worker of marketingWorkers) {
    try {
      const workerTask = tasks.find(task => task.workers && (task.workers[0] === worker.id));
      if (!workerTask) {
        // no tasks - go to work! (if not tired xd)
        await goToWorkOrRest(config, sitesWithFreePlaceForContentWithoutWorkers, worker);
        continue;
      }
      if (workerTask.zone === 'vacation') {
        if (worker.progress.energy > 70 && sitesWithFreePlaceForContentWithoutWorkers.length > 0) {
          const success = await RequestsExecutor.getFromRest(config, worker, workerTask.id);
          if (success) {
            await goToWork(config, sitesWithFreePlaceForContentWithoutWorkers, worker);
          }
        } else {
          logger.log(
            `[${config.username}]: ${worker.name} has a rest and energy is ${worker.progress.energy}. Don't touch him`,
          );
        }
        continue;
      }
      if (workerTask.zone === 'marketing') {
        const { siteId } = workerTask;
        const site = sites.find(currSite => currSite && (currSite.id === siteId));

        const longDurationContents = site.content
          .filter(content => content.status === 1 && (content.contenttypeId === 3 || content.contenttypeId === 6));

        let deletedCount = 0;
        for (const longContentItem of longDurationContents) {
          await RequestsExecutor.deleteContentItem(config, site, longContentItem);
          deletedCount += 1;
        }

        const countOfPreparedContent = site.content.filter(content => content.status === 1).length;
        if (countOfPreparedContent - deletedCount === 4) {
          const success = await RequestsExecutor.finishWorkerTask(config, site, worker);
          if (success) {
            await goToWorkOrRest(config, sitesWithFreePlaceForContentWithoutWorkers, worker);
          }
        }
      } else {
        logger.log(`[${config.username}]: i dont know what to do with ${worker.name}`);
      }
    } catch (error) {
      logger.log(`[${config.username}]: failed handle worker ${worker.name}`);
      logger.log(error, 'ERROR');
    }
  }
}

module.exports = {
  workBitches,
};
