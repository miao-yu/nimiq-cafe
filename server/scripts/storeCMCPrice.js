const axios = require('axios');

const mysql = require('mysql');
const { nimiqCredentials, required } = require('../db-config');

const connection = mysql.createConnection(nimiqCredentials({ database: 'nimiq' }));
connection.connect();

const apiKey = required('CMC_API_KEY');

// CoinMarketCap API URL for the info endpoint
const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
const limit = 2000;

// Function to get information about a cryptocurrency
async function getCMCInfo(symbol) {
  try {
    const response = await axios.get(url, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
      },
      params: {
        limit,
      },
    });

    const data = response.data;

    return data.data.find((crypto) => crypto.symbol === symbol);

  } catch (error) {
    console.error('Error fetching data from CoinMarketCap API:', error.message);
    return null;
  }
}

(async () => {
    // Call the function with the symbol of the cryptocurrency
    const nimiq = await getCMCInfo('NIM'); // Replace 'BTC' with the desired cryptocurrency symbol

    connection.query('INSERT INTO `price` (`price`, `price_change`, `volume`, `volume_change`, `market_cap`, `rank`) VALUES (?,?,?,?,?,?)', [nimiq.quote.USD.price, nimiq.quote.USD.percent_change_24h, nimiq.quote.USD.volume_24h, nimiq.quote.USD.volume_change_24h, nimiq.quote.USD.market_cap, nimiq.cmc_rank], (error, results, fields) => {
      if (error) {
          connection.end();
          throw error;
      }

      console.log('DONE');
      connection.end();
  });
})();