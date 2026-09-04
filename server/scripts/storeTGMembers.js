const axios = require('axios');
const cheerio = require('cheerio');

const mysql = require('mysql');
const { nimiqCredentials } = require('../db-config');

const connection = mysql.createConnection(nimiqCredentials({ database: 'nimiq' }));
connection.connect();

async function getTelegramMemberCount(url) {
  try {
    // Fetch the HTML content
    const response = await axios.get(url);

    // Load the HTML into Cheerio
    const $ = cheerio.load(response.data);

    // Select the element containing the member count
    // The class or structure may vary, inspect the webpage to confirm the selector
    const memberText = $('.tgme_page_extra').text(); 

    // Extract the number from the text
    const match = memberText.match(/([\d\s,]+) members/);

    if (match) {
      // Remove spaces and commas to parse the number correctly
      const memberCount = parseInt(match[1].replace(/[\s,]/g, ''), 10);
      return memberCount;
    } else {
      console.log('Unable to extract member count.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching member count:', error.message);
    return null;
  }
}

(async () => {
  const memberCount = await getTelegramMemberCount('https://t.me/Nimiq');

  if (memberCount) {
    connection.query('INSERT INTO `socialmedia_info` (`date`, `tg_members`) VALUES (?,?) ON DUPLICATE KEY UPDATE `tg_members` = ?', [formatDatetime(new Date()), memberCount, memberCount], (error, results, fields) => {
      if (error) {
          connection.end();
          throw error;
      }

      console.log('DONE');
      connection.end();
    });
  } else {
    console.log('Unable to fetch member count.');
    connection.end();
  }
})();

function formatDatetime(date) {
const d = date,
    month = '0' + (d.getMonth()+1),
    day = '0' + d.getDate(),
    year = d.getFullYear();

return year + '-' + month.substr(-2) + '-' + day.substr(-2);
}
