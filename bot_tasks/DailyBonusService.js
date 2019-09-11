const RequestsExecutor = require('./RequestsExecutor');


async function getDailyBonus(config) {
  await RequestsExecutor.getDailyBonus(config);
}


module.exports = {
  getDailyBonus,
};
