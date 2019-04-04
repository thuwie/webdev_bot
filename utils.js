module.exports = {
    getTs: function getTs() {
        return new Date().getTime();
    },
    sleep: function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    getSiteObj: function getSiteObj(userData, opt) {
        return userData.sites.filter(obj => {
            return obj[opt.field] == opt.property;
        })
    },
    compareObj: function (old, update) {
        const differences = [];
        const ignore = ['startDate', 'money'];
        old.forEach(function (a, i) {
            Object.keys(a).forEach(function (k) {
                if (a[k] !== update[i][k] && ignore.indexOf(k) === -1) {
                    differences.push({ index: i, key: k, oldValue: a[k], newValue: update[i][k]});
                }
            });
        });
        return differences;
    }
};