const mysql = require('mysql');
const { nimiqCredentials } = require('../db-config');

const connection = mysql.createConnection(nimiqCredentials({ database: 'nimiq' }));
connection.connect();

fetch('http://127.0.0.1:8648', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        "jsonrpc": "2.0",
        "method": "getActiveValidators",
        "params": [],
        "id": 1
    })
})
.then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
})
.then(data => {
    let totalValidators = data.result.data.length;

    let totalStakers = 0;
    let totalBalance = 0;

    data.result.data.forEach(validator => {
        totalStakers += validator.numStakers;
        totalBalance += Math.round(validator.balance / 100000);
    });

    connection.query('INSERT INTO `staking_info` (`validator`, `stakers`, `total_staked`) VALUES (?,?,?)', [totalValidators, totalStakers, totalBalance], (error, results, fields) => {
        if (error) {
            connection.end();
            throw error;
        }

        console.log('DONE');
        connection.end();
    });
})
.catch(error => console.error('Failed to do:', error));
