const fs = require('fs');

// This host 302-redirects to validators-api-main.je-cf9.workers.dev. The previous
// https.get() did not follow redirects and wrote the empty redirect body, which
// left storeValidators.js parsing an empty pools.json.
const POOLS_URL = 'https://validators-api-mainnet.pages.dev/api/v1/validators';

(async () => {
    let pools;

    try {
        const response = await fetch(POOLS_URL, { redirect: 'follow' });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        pools = await response.json();
    } catch (error) {
        console.error(`Failed to fetch pools: ${error.message}`);
        process.exit(1);
    }

    // Never overwrite a good pools.json with an empty or malformed response --
    // storeValidators.js depends on it and silently stops updating without it.
    if (!Array.isArray(pools) || pools.length === 0) {
        console.error('Refusing to write pools.json: response was not a non-empty array');
        process.exit(1);
    }

    fs.writeFile(__dirname + '/../json/pools.json', JSON.stringify(pools), (error) => {
        if (error) {
            console.error(`Failed to write pools.json: ${error.message}`);
            process.exit(1);
        }

        console.log(`DONE (${pools.length} pools)`);
    });
})();
