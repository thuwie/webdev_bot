module.exports = {
  getTs: function getTs() {
    return new Date().getTime();
  },

  getTime: function getTime() {
    return Math.floor(Date.now() / 1000);
  },

  sleep: function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
