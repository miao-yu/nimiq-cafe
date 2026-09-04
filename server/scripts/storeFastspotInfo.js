const axios = require('axios');
const https = require('https');
const agent = new https.Agent({
    rejectUnauthorized: false
});

const mysql = require('mysql');
const { nimiqCredentials } = require('../db-config');

const connection = mysql.createConnection(nimiqCredentials({ database: 'nimiq' }));
connection.connect();

axios.get('https://stats.fastspot.io/v2/tickers', { httpsAgent: agent })
.then(function (response) {
    const nimBTC = findPair(response.data, 'NIM/BTC');
    const btcUSDC = findPair(response.data, 'BTC/USDC');
    const btcUSDT = findPair(response.data, 'BTC/USDT');
    const nimUSDC = findPair(response.data, 'NIM/USDC');
    const nimUSDT = findPair(response.data, 'NIM/USDT');

    const fastspotData = [
        formatDatetime(new Date()),
        Math.round(nimBTC.daily_volume_usd), 
        nimBTC.daily_count,
        Math.round(btcUSDC.daily_volume_usd), 
        btcUSDC.daily_count,
        Math.round(btcUSDT.daily_volume_usd), 
        btcUSDT.daily_count,
        Math.round(nimUSDT.daily_volume_usd), 
        nimUSDT.daily_count,
        Math.round(nimUSDC.daily_volume_usd), 
        nimUSDC.daily_count,
        (Math.round(nimBTC.daily_volume_usd) + Math.round(btcUSDC.daily_volume_usd) + Math.round(btcUSDT.daily_volume_usd) + Math.round(nimUSDT.daily_volume_usd) + Math.round(nimUSDC.daily_volume_usd)),
        nimBTC.daily_count + btcUSDC.daily_count + btcUSDT.daily_count + nimUSDT.daily_count + nimUSDC.daily_count
    ];

    connection.query('INSERT INTO `fastspot_info` (`date`, `nimbtc_volume_usd`, `nimbtc_count`, `btcusdc_volume_usd`, `btcusdc_count`, `btcusdt_volume_usd`, `btcusdt_count`, `nimusdt_volume_usd`, `nimusdt_count`, `nimusdc_volume_usd`, `nimusdc_count`, `total_volume`, `total_count`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', fastspotData, (error, results, fields) => {
        if (error) {
            throw error;
            connection.end();
        }

        console.log('Done!');
        connection.end();
    });
})
.catch(function (error) {
    console.log(error);
    connection.end();
});

function formatDatetime(date) {
    const d = date,
        month = '0' + (d.getMonth()+1),
        day = '0' + d.getDate(),
        year = d.getFullYear();
    
    return year + '-' + month.substr(-2) + '-' + day.substr(-2);
}

function findPair(data, pair) {
    return data.find(item => item.pair === pair);
}