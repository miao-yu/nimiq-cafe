const fsPromise = require('fs').promises;

const NIMIQ_WATCH_URL = 'https://v2.nimiqwatch.com/api/v1';

async function getDataFromNimiqWatch(endpoint) {
    const result = await fetch(
        `${NIMIQ_WATCH_URL}${endpoint}`,
        {
          method: 'GET',
        },
    );

    return await result.json();
}

(async function () {
    const [lastMonthActiveAccounts, lastYearActiveAccounts, totalAccounts] = await Promise.all([
        getDataFromNimiqWatch('/statistics/active-accounts/1'),
        getDataFromNimiqWatch('/statistics/active-accounts/12'),
        getDataFromNimiqWatch('/statistics/total-accounts'),
    ]);

    await fsPromise.writeFile(__dirname + '/../json/active-accounts.json', JSON.stringify({
        lastMonth: lastMonthActiveAccounts.active_accounts,
        lastYear: lastYearActiveAccounts.active_accounts,
        total: totalAccounts.total_accounts,
    }));
    
    console.log('DONE');
})();