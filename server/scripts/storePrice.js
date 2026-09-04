const fs = require('fs');
var mysql = require('mysql2/promise');
const { poolCredentials } = require('../db-config');

var now = Math.round(new Date().getTime() / 1000);

(async () => {
    const connection = await mysql.createConnection(poolCredentials());

    const [priceData] = await connection.query(
        'SELECT price FROM nimiq.price order by id desc limit 1'
    );

    const nimUSDPrice = priceData[0].price;

    fs.readFile(__dirname + '/../json/exchange-rates.json', async (err, data) => {
        const exchangeRates = JSON.parse(data);

        var rates = exchangeRates.rates;

        var priceData = {
            'timestamp': now,
            'usd': nimUSDPrice,
        };

        ['eur','aud','brl','cad','cny','gbp','nzd','dkk','jpy','pln','krw','rub','mxn','sek','hkd','myr','sgd','chf','huf','nok','thb','clp','idr','try','ils','php','twd','czk','inr','pkr','zar'].forEach(function(currency) {
            if (['idr', 'krw'].indexOf(currency) < 0) {
                priceData[currency] = (nimUSDPrice * rates[currency.toUpperCase()]).toFixed(6);
            } else {
                priceData[currency] = (nimUSDPrice * rates[currency.toUpperCase()]).toFixed(2);
            }
        });

        fs.writeFile(__dirname+'/../json/price.json', JSON.stringify(priceData), async () => {
            await connection.end();
            console.log('DONE');
        });
    });
})();