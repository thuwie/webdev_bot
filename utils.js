module.exports = {
    getTs: function getTs() {
        return new Date().getTime();
    },
    sleep: function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};