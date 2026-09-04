const https = require('https');
const fs = require('fs');

https.get('https://openexchangerates.org/api/latest.json?app_id=2627a5e768df4170b21c64d5afb3921c&symbols=EUR,DKK,JPY,PLN,AUD,KRW,RUB,BRL,GBP,MXN,SEK,CAD,HKD,MYR,SGD,CHF,HUF,NOK,THB,CLP,IDR,NZD,TRY,CNY,ILS,PHP,TWD,CZK,INR,PKR,ZAR&prettyprint=0', function(result) {
    var ratesData = '';
    result.on('data', function (ratesChunk) {
        ratesData += ratesChunk;
    });
    result.on('end', function () {
        var currencyData = JSON.stringify(JSON.parse(ratesData));

        fs.writeFile(__dirname+'/../json/exchange-rates.json', currencyData, () => {
            console.log('DONE');
        });
    });
});