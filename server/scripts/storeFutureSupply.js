const Nimiq = require('/var/www/core-js/dist/node.js');
const fs = require('fs');

let height = 721;
let timestamp = 1523746800;

let supply;
let futureSupply = [];
const now = new Date();

do {
    if (timestamp > now.getTime() / 1000) {
        supply = Math.round(Nimiq.Policy.supplyAfter(height) / 100000);

        futureSupply.push({
            'supply': supply,
            'datetime': _formatDatetime(timestamp)
        });
    }

    const startDate = new Date(timestamp * 1000); // Convert the timestamp to a Date object
  
    // Start with the first day of the month of the given timestamp
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    currentDate.setMonth(currentDate.getMonth() + 1); // Move to the first day of the next month

    height = Math.round((currentDate.getTime() - startDate.getTime()) / 60000) + height;
    timestamp = currentDate.getTime() / 1000;
} while (timestamp < (now.getTime() / 1000 + 86400 * 365 * 5));

fs.writeFile(__dirname+'/../json/future-supply.json', JSON.stringify(futureSupply), () => {
    console.log('DONE');
});

function _formatDatetime(timestamp) {
    const d = new Date(timestamp * 1000),
        month = '0' + (d.getMonth()+1),
        day = '0' + d.getDate(),
        year = d.getFullYear();

    return year + '-' + month.substr(-2) + '-' + day.substr(-2);
}
