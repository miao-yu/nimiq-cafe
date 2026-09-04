// db-config loads server/.env by absolute path, so it must come first: everything
// below reads process.env.
const { poolCredentials, required } = require('./db-config');

const fs = require('fs');
const fsPromise = require('fs').promises;
const Redis = require('ioredis');
var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');

const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const Nimiq = require("@nimiq/core");
const HubApi = require('@nimiq/hub-api');
const cors = require('cors');

var logger = require('morgan');
var mysql = require('mysql2/promise');
const path = require('path');
var currencies = require(__dirname + '/json/currency.json');
const seo = require('./seo');

var addressBook = require(__dirname + '/json/address-book.json');

const redis = new Redis();

const pool = mysql.createPool(poolCredentials({
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  }));

const JSON_RPC_URL = 'http://127.0.0.1:8648';
const VALIDATOR_ADDRESS = 'NQ83 4MVH 53Q4 AL3B Q097 55GJ LUQ3 GSF0 85B7';
const PAYOUT_TYPE_RESTAKE = 0;
const PAYOUT_TYPE_PAYOUT = 1;
const PAYOUT_TYPE_RESTAKE_TEXT = 'Restake';
const PAYOUT_TYPE_PAYOUT_TEXT = 'Payout';
const NIMIQ_WATCH_URL = 'https://v2.nimiqwatch.com/api/v1';
const NIMIQ_HUB_URL = 'https://api.nimiqhub.com';
// Signs the 30-day session tokens issued by /api/auth/sign-in. Required rather
// than defaulted: a fallback here would let every deploy that forgot .env sign
// tokens with a value that is the same everywhere.
const JWT_SECRET = required('JWT_SECRET');
const DEFAULT_POOL_FEE = 0;

const TRANSACTION_LIST_KEY = 'transactions';
const BLOCK_LIST_KEY = 'blocks';

var app = express();

if (process.env.NODE_ENV == 'PROD') {
    app.use(express.static(path.join(__dirname, '../client/dist'), {
        // Without this express.static answers "/" with dist/index.html directly
        // and the request never reaches the catch-all below, so the domain root
        // -- the most linked URL there is -- would ship the untouched shell with
        // no title, canonical or structured data.
        index: false,
        setHeaders: (res, filePath) => {
            // Vite fingerprints everything in assets/ (index-CCHgDzQA.js), so the
            // URL changes whenever the bytes do and the file can be cached for
            // good. It was previously served with max-age=0, which made every
            // repeat visitor revalidate ~600kB of unchanged JavaScript.
            if (filePath.includes(`${path.sep}assets${path.sep}`)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            } else if (filePath.endsWith('.html')) {
                // The shell is rewritten per request and per deploy; caching it
                // would pin visitors to a stale asset manifest.
                res.setHeader('Cache-Control', 'no-cache');
            } else {
                // Logos, fonts, favicon: stable but not fingerprinted, so a day.
                res.setHeader('Cache-Control', 'public, max-age=86400');
            }
        },
    }));
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());

app.use(cors({
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  }));

app.post('/api/auth/sign-in', async (req, res) => {
    const { message, base64Signature, base64SignerPublicKey, signer } = req.body;

    const signature = Uint8Array.from(Buffer.from(base64Signature, 'base64'));
    const signerPublicKey = Uint8Array.from(Buffer.from(base64SignerPublicKey, 'base64'));
  
    const isValid = verifySignature(signerPublicKey, signature, message);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
  
    const accessToken = generateToken(signer);

    res.status(200).json({ accessToken });
  });

app.get('/api/payout-history', async function(req, res, next) {
    const payoutHistoryData = await getPayoutHistory();

    const payoutHistory = payoutHistoryData.map(payout => {
        return {
            txHash: payout.tx_hash,
            txHashLink: `/tx/${payout.tx_hash}`,
            epoch: payout.epoch,
            address: payout.staker,
            addressLink: `/wallet/${payout.staker}`,
            avatar: `https://v2.nimiqwatch.com/api/v1/iqon/${payout.staker.replaceAll(' ', '+')}`,
            rewards: payout.rewards / 100000,
            payoutType: payout.payout_type == PAYOUT_TYPE_RESTAKE ? PAYOUT_TYPE_RESTAKE_TEXT : PAYOUT_TYPE_PAYOUT_TEXT,
            createdAt: payout.created_at
        };
    });

    res.json(payoutHistory);
});

app.get('/api/pool-rewards', async function(req, res, next) {
    const poolRewardsData = await getPoolRewards();

    const poolRewards = poolRewardsData.map(reward => {
        return {
            txHash: reward.tx_hash,
            txHashLink: `/tx/${reward.tx_hash}`,
            blockNumber: reward.block_number,
            blockNumberLink: `/block/${reward.block_number}`,
            epoch: reward.epoch,
            value: reward.value / 100000,
            createdAt: reward.created_at
        };
    });

    res.json(poolRewards);
});

app.get('/api/stakedinfo', async function(req, res, next) {
    const [activeValidators, validatorByAddress] = await Promise.all([
        getActiveValidators(), 
        getPoolValidator(),
    ]);

    let totalValidators = activeValidators.length;

    let totalStakers = 0;
    let totalBalance = 0;

    activeValidators.forEach(validator => {
        totalStakers += validator.numStakers;
        totalBalance += Math.round(validator.balance / 100000);
    });

    const network = {
        totalValidators: totalValidators,
        totalStakers: totalStakers,
        totalBalance: totalBalance
    };

    const poolShare = Math.round((validatorByAddress.balance / totalBalance) / 10) / 100;
    const poolTotalStakers = validatorByAddress.numStakers;
    const poolTotalBalance = Math.round(validatorByAddress.balance / 100000);

    const validator = {
        poolShare,
        poolTotalStakers,
        poolTotalBalance
    };

    res.json({
        network, 
        validator,
    });
});

app.get('/api/latest-blocks', async function(req, res, next) {
    const blockStrings = await redis.lrange(BLOCK_LIST_KEY, 0, -1);
    const blocks = blockStrings.map((blockString) => JSON.parse(blockString));

    res.json(blocks);
});

app.get('/api/poolstakers/:address', async function(req, res, next) {
    const address = req.params.address;

    const [validatorByAddress, stakerByAddress, stakerTotalRewardsPayoutType, accountByAddress] = await Promise.all([
        getPoolValidator(),
        getStakerByAddress(address),
        getStakerTotalRewardsPayoutType(),
        getAccountByAddress(address),
    ]);

    if (!accountByAddress || !stakerByAddress || stakerByAddress.delegation != VALIDATOR_ADDRESS ) {
        res.status(404).json({ message: 'Not Found' });
        return;
    }

    res.json(
        {
            address: stakerByAddress.address,
            addressLink: `/wallet/${stakerByAddress.address}`,
            avatar: `https://v2.nimiqwatch.com/api/v1/iqon/${stakerByAddress.address.replaceAll(' ', '+')}`,
            stakedNIM: stakerByAddress.balance / 100000,
            inactiveBalance: stakerByAddress.inactiveBalance / 100000,
            walletBalance: accountByAddress.balance / 100000,
            totalBalance: (stakerByAddress.balance + stakerByAddress.inactiveBalance + accountByAddress.balance) / 100000,
            pendingPayout: stakerTotalRewardsPayoutType.stakerTotalRewardMapping[stakerByAddress.address] || 0,
            shared: Math.round((stakerByAddress.balance / validatorByAddress.balance) * 10000) / 100,
            payoutType: stakerTotalRewardsPayoutType.stakerPayoutTypeMapping[stakerByAddress.address] || PAYOUT_TYPE_RESTAKE_TEXT,
            joinDate: stakerTotalRewardsPayoutType.stakerJoinDateMapping[stakerByAddress.address]
        }
    );
});

app.get('/api/wallet/:address', async function(req, res, next) {
    const address = req.params.address;

    const [validatorByAddress, stakersByValidatorAddress, stakerByAddress, accountByAddress, activeValidators, transactionsByAddress] = await Promise.all([
        getValidatorByAddress(address),
        getStakersByValidatorAddress(address),
        getStakerByAddress(address),
        getAccountByAddress(address),
        getActiveValidators(),
        getTransactionsByAddressFromNimiqHub(address)
    ]);

    if (!accountByAddress ) {
        res.status(404).json({ message: 'Not Found' });
        return;
    }

    const walletInfo = {
        account: {
            address: accountByAddress.address,
            name: addressBook[accountByAddress.address] ? addressBook[accountByAddress.address].name : fShortenString(accountByAddress.address),
            avatar: addressBook[accountByAddress.address] && addressBook[accountByAddress.address].logo ? addressBook[accountByAddress.address].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${accountByAddress.address.replaceAll(' ', '+')}`,
            addressLink: `/wallet/${accountByAddress.address}`,
            walletBalance: accountByAddress.balance / 100000,
        },
        transactions: transactionsByAddress
    };

    if (stakerByAddress) {
        const stakerValidator = await getValidatorByAddress(stakerByAddress.delegation);
        walletInfo.staker = {
            stakingBalance: stakerByAddress.balance / 100000,
            inactiveBalance: stakerByAddress.inactiveBalance / 100000,
            retiredBalance: stakerByAddress.retiredBalance / 100000,
            totalBalance: (stakerByAddress.balance + stakerByAddress.inactiveBalance + accountByAddress.balance) / 100000,
            shared: Math.round((stakerByAddress.balance / stakerValidator.balance) * 10000) / 100,
            validatorAddress: stakerValidator.address,
            validatorName: addressBook[stakerValidator.address] ? addressBook[stakerValidator.address].name : fShortenString(stakerValidator.address),
            validatorAvatar: addressBook[stakerValidator.address] && addressBook[stakerValidator.address].logo ? addressBook[stakerValidator.address].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${stakerValidator.address.replaceAll(' ', '+')}`,
            validatorAddressLink: `/wallet/${stakerValidator.address}`,  
        };
    }

    if (validatorByAddress) {
        let totalStakers = 0;
        let totalBalance = 0;
    
        activeValidators.forEach(validator => {
            totalStakers += validator.numStakers;
            totalBalance += Math.round(validator.balance / 100000);
        });

        stakersByValidatorAddress.sort((a, b) => b.balance - a.balance);

        walletInfo.validator = {
            address: validatorByAddress.address,
            name: addressBook[validatorByAddress.address] ? addressBook[validatorByAddress.address].name : fShortenString(validatorByAddress.address),
            avatar: addressBook[validatorByAddress.address] && addressBook[validatorByAddress.address].logo ? addressBook[validatorByAddress.address].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${validatorByAddress.address.replaceAll(' ', '+')}`,
            addressLink: `/wallet/${validatorByAddress.address}`,
            signingKey: validatorByAddress.signingKey,
            votingKey: validatorByAddress.votingKey,
            rewardAddress: validatorByAddress.rewardAddress,
            rewardName: addressBook[validatorByAddress.rewardAddress] ? addressBook[validatorByAddress.rewardAddress].name : fShortenString(validatorByAddress.rewardAddress),
            rewardAvatar: addressBook[validatorByAddress.rewardAddress] && addressBook[validatorByAddress.address].logo ? addressBook[validatorByAddress.rewardAddress].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${validatorByAddress.rewardAddress.replaceAll(' ', '+')}`,
            rewardAddressLink: `/wallet/${validatorByAddress.rewardAddress}`,
            numStakers: validatorByAddress.numStakers,
            numStakersShare: totalStakers > 0 ? (validatorByAddress.numStakers / totalStakers) * 100 : 0,
            balance: validatorByAddress.balance / 100000,
            balanceShare: totalBalance > 0 ? ((validatorByAddress.balance / 100000) / totalBalance) * 100 : 0,
            stakers: stakersByValidatorAddress.map(staker => {
                return {
                    address: staker.address,
                    name: addressBook[staker.address] ? addressBook[staker.address].name : fShortenString(staker.address),
                    avatar: addressBook[staker.address] && addressBook[staker.address].logo ? addressBook[staker.address].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${staker.address.replaceAll(' ', '+')}`,
                    addressLink: `/wallet/${staker.address}`,
                    stakedNIM: staker.balance / 100000,
                    shared: ((staker.balance / validatorByAddress.balance) * 10000) / 100
                };
            })
        };
    }

    res.json(walletInfo);
});

app.get('/api/settings', authenticateToken, async function(req, res) {
    const user = req.user;

    const payoutType = await getStakerSettings(user.address);

    if (payoutType === null) {
        return res.status(404).json({ message: 'Not found' });
    }

    res.json(
        {
            payoutType: payoutType == PAYOUT_TYPE_RESTAKE ? PAYOUT_TYPE_RESTAKE_TEXT : PAYOUT_TYPE_PAYOUT_TEXT
        }
    );
});

app.post('/api/settings', authenticateToken, async (req, res) => {
    const user = req.user;
    const { payoutType } = req.body;
  
    if (!user || !user.address || !payoutType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    try {
      await updateStakerSettings(user.address, payoutType == PAYOUT_TYPE_RESTAKE_TEXT ? PAYOUT_TYPE_RESTAKE : PAYOUT_TYPE_PAYOUT);
      
      res.status(200).json({ message: 'Payout type updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update payout type' });
    }
  });

app.get('/api/dailyrewards/:address', async function(req, res, next) {
    const address = req.params.address;

    const dailyRewards = await getStakerDailyRewards(address);

    res.json(
        dailyRewards.map(dailyReward => {
            return {
                totalRewards: Math.floor(dailyReward.total_rewards / 100000),
                rewardDate: dailyReward.reward_date
            };
        })
    );
});

app.get('/api/totalrewards/:address', async function(req, res, next) {
    const address = req.params.address;

    const [totalRewards, todayRewards, last30DaysRewards, stakerPendingPayout] = await Promise.all([
        getStakerTotalRewards(address),
        getStakerTodayRewards(address),
        getStakerLast30DaysRewards(address),
    ]);

    res.json(
        {
            totalRewards: totalRewards.totalRewards,
            todayRewards: todayRewards / 100000,
            last30DaysRewards: last30DaysRewards / 100000,
            pendingPayout: totalRewards.pendingPayout / 100000
        }
    );
});

app.get('/api/rewards/:address', async function(req, res, next) {
    const address = req.params.address;

    const rewards = await getStakerRewards(address);

    res.json(
        rewards.map(reward => {
            return {
                epoch: reward.epoch,
                reward: reward.rewards / 100000,
                created: reward.created_at
            };
        })
    );
});

app.get('/api/block/:blockNumber', async function(req, res, next) {
    const blockNumber = req.params.blockNumber;

    const block = await getBlockByNumberFromNimiqHub(parseInt(blockNumber));

    if (!block) {
        res.status(404).json({ message: 'Not Found' });
        return;
    }

    const blockFormatted = {
        number: block.number,
        hash: block.hash,
        // type: block.type,
        // epoch: block.epoch,
        size: block.size,
        datetime: _formatDatetime(block.timestamp / 1000),
        txCount: block.transactions.length,
        txVolume: block.transactions.reduce((sum, tx) => sum + tx.value, 0) / 100000,
        transactions: block.transactions.map(tx => {
            return {
                hash: tx.hash,
                // size: tx.size,
                blockNumber: tx.blockNumber,
                from: tx.from,
                fromName: addressBook[tx.from] ? addressBook[tx.from].name : fShortenString(tx.from),
                fromAvatar: addressBook[tx.from] && addressBook[tx.from].logo ? addressBook[tx.from].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.from.replaceAll(' ', '+')}`,
                fromLink: `/wallet/${tx.from}`,
                to: tx.to,
                toName: addressBook[tx.to] ? addressBook[tx.to].name : fShortenString(tx.to),
                toAvatar: addressBook[tx.to] && addressBook[tx.to].logo ? addressBook[tx.to].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.to.replaceAll(' ', '+')}`,
                toLink: `/wallet/${tx.to}`,
                value: tx.value / 100000,
                fee: tx.fee / 100000,
                // validityStartHeight: tx.validityStartHeight,
                link: `/tx/${tx.hash}`
            };
        })
    };

    if (block.producer && block.producer.validator) {
        blockFormatted.producer = {
            validator: block.producer.validator,
            validatorName: addressBook[block.producer.validator] ? addressBook[block.producer.validator].name : fShortenString(block.producer.validator),
            validatorAvatar: addressBook[block.producer.validator] && addressBook[block.producer.validator].logo ? addressBook[block.producer.validator].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${block.producer.validator.replaceAll(' ', '+')}`,
            validatorLink: `/wallet/${block.producer.validator}`,
            slotNumber: block.producer.slotNumber,
            publicKey: block.producer.publicKey,
        };
    }

    res.json(blockFormatted);
});

app.get('/api/tx/:hash', async function(req, res, next) {
    const hash = req.params.hash;

    const tx = await getTransactionByHashFromNimiqHub(hash);

    if (!tx) {
        res.status(404).json({ message: 'Not Found' });
        return;
    }

    res.json({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        fromName: addressBook[tx.from] ? addressBook[tx.from].name : fShortenString(tx.from),
        fromAvatar: addressBook[tx.from] && addressBook[tx.from].logo ? addressBook[tx.from].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.from.replaceAll(' ', '+')}`,
        fromLink: `/wallet/${tx.from}`,
        to: tx.to,
        toName: addressBook[tx.to] ? addressBook[tx.to].name : fShortenString(tx.to),
        toAvatar: addressBook[tx.to] && addressBook[tx.to].logo ? addressBook[tx.to].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.to.replaceAll(' ', '+')}`,
        toLink: `/wallet/${tx.to}`,
        value: tx.value / 100000,
        fee: tx.fee / 100000,
        validityStartHeight: tx.validityStartHeight,
        confirmations: tx.confirmations || 0,
        datetime: _formatDatetime(tx.timestamp / 1000),
        link: `/tx/${tx.hash}`
    });
});

app.get('/api/price-info', async function(req, res, next) {
    const priceInfo = await getPriceInfo();

    res.json(priceInfo);
});

app.get('/api/payouts/:address', async function(req, res, next) {
    const address = req.params.address;

    const payouts = await getStakerPayouts(address);

    res.json(
        payouts.map(payout => {
            return {
                epoch: payout.epoch,
                reward: payout.rewards / 100000,
                payoutType: payout.payout_type == PAYOUT_TYPE_RESTAKE ? PAYOUT_TYPE_RESTAKE_TEXT : PAYOUT_TYPE_PAYOUT_TEXT,
                txHash: payout.tx_hash,
                created: payout.created_at
            };
        })
    );
});

app.get('/api/today-active-users', async function(req, res, next) {
    const todayActiveUsers = await getTodayActiveUsers();

    res.json(todayActiveUsers);
});

app.get('/api/poolstakers', async function(req, res, next) {
    const [validatorByAddress, stakersByValidatorAddress, stakerTotalRewardsPayoutType] = await Promise.all([
        getPoolValidator(),
        getPoolStakers(),
        getStakerTotalRewardsPayoutType()
    ]);

    stakersByValidatorAddress.sort((a, b) => b.balance - a.balance);

    const stakers = stakersByValidatorAddress.map(staker => {
        return {
            address: staker.address,
            addressLink: `/wallet/${staker.address}`,
            avatar: `https://v2.nimiqwatch.com/api/v1/iqon/${staker.address.replaceAll(' ', '+')}`,
            stakedNIM: Math.round(staker.balance / 100000),
            pendingPayout: stakerTotalRewardsPayoutType.stakerTotalRewardMapping[staker.address] || 0,
            shared: Math.round((staker.balance / validatorByAddress.balance) * 10000) / 100,
            payoutType: stakerTotalRewardsPayoutType.stakerPayoutTypeMapping[staker.address] || PAYOUT_TYPE_RESTAKE_TEXT,
            joinDate: stakerTotalRewardsPayoutType.stakerJoinDateMapping[staker.address]
        };
    });

    res.json(stakers);
});

app.get('/api/daily-stakedinfo', async function(req, res, next) {
    fs.readFile(__dirname + '/json/staking-info.json', async (err, historyData) => {
        let history = JSON.parse(historyData);

        let dailyValidators = [];
        let dailyStakers = [];
        let dailyTotalStaked = [];

        if (history.length > 0) {
            history = history.slice(0, 30);

            history.sort((a, b) => {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            history.forEach((his) => {
                const date = his.created_at.slice(0, 10);

                dailyValidators.push({
                    date: date,
                    value: his.validator
                });

                dailyStakers.push({
                    date: date,
                    value: his.stakers
                });

                dailyTotalStaked.push({
                    date: date,
                    value: his.total_staked
                });
            });
        }

        res.json({
            dailyValidators,
            dailyStakers,
            dailyTotalStaked
        });
    });
});

app.get('/api/daily-socialmedia', async function(req, res, next) {
    fs.readFile(__dirname + '/json/socialmedia-info.json', async (err, historyData) => {
        let history = JSON.parse(historyData);

        let dailyXFollowers = [];
        let dailyCMCRank = [];
        let dailyTGMembers = [];

        if (history.length > 0) {
            history = history.slice(0, 30);

            history.sort((a, b) => {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            history.forEach((his) => {
                const date = his.date.slice(0, 10);

                dailyXFollowers.push({
                    date: date,
                    value: his.x_followers
                });

                dailyCMCRank.push({
                    date: date,
                    value: his.cmc_rank
                });

                dailyTGMembers.push({
                    date: date,
                    value: his.tg_members
                });
            });
        }

        res.json({
            dailyXFollowers,
            dailyCMCRank,
            dailyTGMembers
        });
    });
});


app.get('/api/daily-fastspot', async function(req, res, next) {
    fs.readFile(__dirname + '/json/fastspot-info.json', async (err, historyData) => {
        let history = JSON.parse(historyData);

        if (history.length > 0) {
            history = history.slice(0, 30);

            history.sort((a, b) => {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
        }

        res.json(
            history.map((his) => {
                return {
                    date: his.date.slice(0, 10),
                    nimbtcVolume: his.nimbtc_volume_usd,
                    nimbtcCount: his.nimbtc_count,
                    btcusdcVolume: his.btcusdc_volume_usd,
                    btcusdcCount: his.btcusdc_count,
                    btcusdtVolume: his.btcusdt_volume_usd,
                    btcusdtCount: his.btcusdt_count,
                    nimusdtVolume: his.nimusdt_volume_usd,
                    nimusdtCount: his.nimusdt_count,
                    nimusdcVolume: his.nimusdc_volume_usd,
                    nimusdcCount: his.nimusdc_count,
                    totalVolume: his.total_volume,
                    totalCount: his.total_count
                };
            })
        );
    });
});

app.get('/api/daily-transactions', async function(req, res, next) {
    fs.readFile(__dirname + '/json/blockchain-info.json', async (err, historyData) => {
        let history = JSON.parse(historyData);

        let dailyTXs = [];
        let dailyTPS = [];
        let dailyBurstTPS = [];
        let dailyTXVolume = [];
        let dailyActiveUsers = [];
        let dailyBlockSizes = [];
        let dailyFees = [];

        if (history.length > 0) {
            history = history.slice(0, 30);

            history.sort((a, b) => {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            history.forEach((his) => {
                const date = his.date.slice(0, 10);

                dailyTXs.push({
                    date: date,
                    value: his.total_tx
                });

                dailyTPS.push({
                    date: date,
                    value: his.total_tx / 86400
                });

                dailyBurstTPS.push({
                    date: date,
                    value: his.max_tps
                });

                dailyTXVolume.push({
                    date: date,
                    value: his.total_value * 1000
                });

                dailyActiveUsers.push({
                    date: date,
                    value: his.total_senders + his.total_receivers
                });

                dailyBlockSizes.push({
                    date: date,
                    value: his.total_size * 1024
                });

                dailyFees.push({
                    date: date,
                    value: his.total_fee / 100
                });
            });
        }

        res.json({
            dailyTXs,
            dailyTPS,
            dailyBurstTPS,
            dailyTXVolume,
            dailyActiveUsers,
            dailyBlockSizes,
            dailyFees
        });
    });
});

app.get('/api/pools', async function(req, res, next) {
    const lastElectionSlots = await getLastElectionSlots();

    let lastElectionSlotsMapping = {};
    if (lastElectionSlots.length > 0) {
        lastElectionSlots.forEach(lastElectionSlot => {
            lastElectionSlotsMapping[lastElectionSlot.validator] = lastElectionSlot.numSlots;
        });
    }

    const validatorsString = await fsPromise.readFile(__dirname + '/json/validators.json', 'utf-8');
    const validators = JSON.parse(validatorsString);

    const totalBalance = validators.reduce((sum, validator) => sum + Math.round(validator.balance / 100000), 0);
    const totalStakers = validators.reduce((sum, validator) => sum + validator.numStakers, 0);
    
    const filteredValidators = validators.filter((validator) => validator.payoutType !== undefined && validator.payoutType !== 'none');

    filteredValidators.sort((a, b) => {
        return b.balance - a.balance;
    });

    const validatorsInfo = filteredValidators.map((validator, index) => {
        const validatorBalance = Math.round(validator.balance / 100000);

        let name = addressBook[validator.address] ? addressBook[validator.address].name : validator.name;
        if (name == validator.address || name.length > 20) {
            name = fShortenString(name);
        }

        const numSlots = lastElectionSlotsMapping[validator.address] || 0;

        return {
            ...validator,
            name,
            address: validator.address,
            logo: addressBook[validator.address] && addressBook[validator.address].logo ? addressBook[validator.address].logo : validator.logo,
            addressLink: `/wallet/${validator.address}`,
            balance: validatorBalance,
            numStakers: validator.numStakers,
            balanceShare: totalBalance > 0 ? (validatorBalance / totalBalance) * 100 : 0,
            numStakersShare: totalStakers > 0 ? (validator.numStakers / totalStakers) * 100 : 0,
            isElected: numSlots > 0,
            rank: index + 1
        };
    });

    res.json(validatorsInfo);
});

app.get('/api/pools/:address', async function(req, res, next) {
    const address = req.params.address;

    const lastElectionSlots = await getLastElectionSlots();

    let lastElectionSlotsMapping = {};
    if (lastElectionSlots.length > 0) {
        lastElectionSlots.forEach(lastElectionSlot => {
            lastElectionSlotsMapping[lastElectionSlot.validator] = lastElectionSlot.numSlots;
        });
    }

    const validatorsString = await fsPromise.readFile(__dirname + '/json/validators.json', 'utf-8');
    const validators = JSON.parse(validatorsString);

    const totalBalance = validators.reduce((sum, validator) => sum + Math.round(validator.balance / 100000), 0);
    const totalStakers = validators.reduce((sum, validator) => sum + validator.numStakers, 0);
    
    const filteredValidators = validators.filter((validator) => validator.address === address);

    if (filteredValidators.length === 0) {
        res.status(404).json({ message: 'Not Found' });
        return;
    }

    const validator = filteredValidators[0];

    const [validatorByAddress, stakersByValidatorAddress] = await Promise.all([
        getValidatorByAddress(address),
        getStakersByValidatorAddress(address),
    ]);

    stakersByValidatorAddress.sort((a, b) => b.balance - a.balance);

    const validatorBalance = Math.round(validator.balance / 100000);

    let name = addressBook[validator.address] ? addressBook[validator.address].name : validator.name;
    if (name == validator.address || name.length > 20) {
        name = fShortenString(name);
    }

    const numSlots = lastElectionSlotsMapping[validator.address] || 0;

    res.json({
        ...validator,
        name,
        address: validator.address,
        logo: addressBook[validator.address] && addressBook[validator.address].logo ? addressBook[validator.address].logo : validator.logo,
        addressLink: `/wallet/${validator.address}`,
        balance: validatorBalance,
        numStakers: validator.numStakers,
        balanceShare: totalBalance > 0 ? (validatorBalance / totalBalance) * 100 : 0,
        numStakersShare: totalStakers > 0 ? (validator.numStakers / totalStakers) * 100 : 0,
        isElected: numSlots > 0,
        stakers: stakersByValidatorAddress.map(staker => {
            const addressInfo = fAddressInfo(staker.address);
            const name = addressInfo ? addressInfo.name : fShortenString(staker.address);
            const avatar = addressInfo && addressInfo.logo ? addressInfo.logo : `https://v2.nimiqwatch.com/api/v1/iqon/${staker.address.replaceAll(' ', '+')}`;
            
            return {
                address: staker.address,
                name,
                avatar,
                addressLink: `/wallet/${staker.address}`,
                stakedNIM: staker.balance / 100000,
                shared: ((staker.balance / validatorByAddress.balance) * 10000) / 100
            };
        })
    });
});

app.get('/api/elected-validators', async function(req, res, next) {
    const lastElectionSlots = await getLastElectionSlots();

    let lastElectionSlotsMapping = {};
    if (lastElectionSlots.length > 0) {
        lastElectionSlots.forEach(lastElectionSlot => {
            lastElectionSlotsMapping[lastElectionSlot.validator] = lastElectionSlot.numSlots;
        });
    }

    const validatorsString = await fsPromise.readFile(__dirname + '/json/validators.json', 'utf-8');
    const validators = JSON.parse(validatorsString);

    const totalBalance = validators.reduce((sum, validator) => sum + Math.round(validator.balance / 100000), 0);
    const totalStakers = validators.reduce((sum, validator) => sum + validator.numStakers, 0);
    const totalSlots = lastElectionSlots.reduce((sum, slot) => sum + slot.numSlots, 0);

    validators.sort((a, b) => {
        return b.balance - a.balance;
    });

    const validatorsInfo = validators.map((validator, index) => {
        const validatorBalance = Math.round(validator.balance / 100000);

        let name = addressBook[validator.address] ? addressBook[validator.address].name : validator.name;
        if (name == validator.address) {
            name = fShortenString(name);
        }

        const numSlots = lastElectionSlotsMapping[validator.address] || 0;

        return {
            name,
            address: validator.address,
            logo: addressBook[validator.address] && addressBook[validator.address].logo ? addressBook[validator.address].logo : validator.logo,
            addressLink: `/wallet/${validator.address}`,
            balance: validatorBalance,
            numStakers: validator.numStakers,
            numSlots: numSlots,
            balanceShare: totalBalance > 0 ? (validatorBalance / totalBalance) * 100 : 0,
            numStakersShare: totalStakers > 0 ? (validator.numStakers / totalStakers) * 100 : 0,
            numSlotsShare: totalSlots > 0 ? (numSlots / totalSlots) * 100 : 0,
            rank: index + 1
        };
    });

    res.json(validatorsInfo.filter((validator) => validator.numSlots !== 0));
});

// Resolves whatever the explorer search box was given to the page that can show
// it. Block and transaction hashes are both 64 hex characters and cannot be told
// apart by shape, so those two lookups run in parallel and whichever resolves
// wins. Doing this here rather than in the browser keeps it to one round trip.
app.get('/api/search/:query', async function(req, res, next) {
    const query = String(req.params.query).trim();

    // A bare number is a block height.
    if (/^\d+$/.test(query)) {
        const block = await getBlockByNumberFromNimiqHub(parseInt(query));

        if (block) {
            res.json({ type: 'block', blockNumber: block.number });
            return;
        }
    }

    // Addresses are accepted with or without the usual spacing.
    const compactAddress = query.toUpperCase().replace(/\s+/g, '');

    if (/^NQ[0-9A-Z]{34}$/.test(compactAddress)) {
        const address = compactAddress.match(/.{1,4}/g).join(' ');
        const account = await getAccountByAddress(address);

        if (account) {
            res.json({ type: 'address', address });
            return;
        }
    }

    if (/^[0-9a-fA-F]{64}$/.test(query)) {
        const hash = query.toLowerCase();

        const [block, transaction] = await Promise.all([
            getBlockByHashFromRPC(hash),
            getTransactionByHashFromNimiqHub(hash).catch(() => null),
        ]);

        if (block) {
            res.json({ type: 'block', blockNumber: block.number });
            return;
        }

        if (transaction) {
            res.json({ type: 'transaction', hash: transaction.hash });
            return;
        }
    }

    res.json({ type: null });
});

app.get('/api/nim-price', async function(req, res, next) {
    const price = await fsPromise.readFile(__dirname + '/json/price.json')
    res.json(JSON.parse(price));
});

app.get('/api/latest-txs', async function(req, res, next) {
    const transactionStrings = await redis.lrange(TRANSACTION_LIST_KEY, 0, -1);
    const transactions = transactionStrings.map((transactionString) => JSON.parse(transactionString));

    res.json(transactions);
});

app.get('/api/supply', async function(req, res, next) {
    const supply = await fsPromise.readFile(__dirname + '/json/future-supply.json')
    res.json(JSON.parse(supply));
});

app.get('/api/active-accounts', async function(req, res, next) {
    fs.readFile(__dirname + '/json/active-accounts.json', async (err, data) => {
        res.json(JSON.parse(data));
    });
});

app.get('/api/calculator', async function(req, res, next) {
    var formValues = {
        'stakingAmount': 1000000,
        'restake': true,
        'poolFee': 1,
        'currency': 'USD'
    };

    if (req.cookies.formValues != null) {
        var formValuesCookies = JSON.parse(req.cookies.formValues);

        for (var key in formValuesCookies) {
            formValues[key] = formValuesCookies[key];
        }
    }

    const activeValidators = await getActiveValidators();

    let totalBalance = 0;

    activeValidators.forEach(validator => {
        totalBalance += Math.round(validator.balance / 100000);
    });

    const totalSupply = _posSupplyAt(new Date().getTime());

    const circulatingSupplyStaked = Math.round(totalBalance / totalSupply * 100);

    fs.readFile(__dirname + '/json/price.json', async (err, data) => {
        var price = JSON.parse(data);
        var currency = formValues.currency;

        var stakingAmount = formValues.stakingAmount;

        var nimPrice = {};
        Object.keys(price).forEach(function(column) {
            if (column.length == 3 && column != 'btc') {
                nimPrice[column.toUpperCase()] = price[column];
            }
        });

        var currencyPrice = price[currency.toLowerCase()];

        var poolFee = formValues.poolFee;
        var restake = formValues.restake;

        // The current network value is offered alongside the presets, deduped so
        // it does not appear twice when it happens to match one of them.
        var circulatingSupplyStakedOptions = [...new Set([25, 45, 50, 55, 60, 75, circulatingSupplyStaked])];
        circulatingSupplyStakedOptions.sort((a, b) => a - b);

        res.json({
            currency,
            circulatingSupplyStaked,
            circulatingSupplyStakedOptions,
            stakingAmount,
            sign:currencies[currency].symbol, currencyPrice, nimPrice,
            currencies,
            restake,
            poolFee,
            price, 
        });
    });
});

// Served in every environment so the output can be checked without a prod
// build. They sit above the catch-all because that would otherwise answer them
// with index.html -- which is exactly what used to happen: /robots.txt and
// /sitemap.xml both returned the SPA shell as text/html, so Google never got
// crawl directives and had no sitemap to discover pages from.
app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(seo.robotsTxt());
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml').send(seo.buildSitemap());
});

if (process.env.NODE_ENV == 'PROD') {
    const INDEX_HTML = path.join(__dirname, '../client/dist/index.html');

    app.get('*', (req, res, next) => {
        fs.readFile(INDEX_HTML, 'utf-8', (err, html) => {
            if (err) {
                return next(err);
            }

            // Route-specific title, description, canonical, social preview and
            // JSON-LD, injected before the bundle runs so crawlers that do not
            // execute JavaScript still get them. See server/seo.js.
            //
            // no-cache rather than a max-age: the shell names the hashed bundle,
            // so a cached copy would keep serving the previous deploy's assets.
            res.set('Cache-Control', 'no-cache');
            res.type('html').send(seo.renderShell(html, req.path));
        });
    });
}

async function getActiveValidators() {
    const getActiveValidatorsResult = await fetch(JSON_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "jsonrpc": "2.0",
          "method": "getActiveValidators",
          "params": [],
          "id": 1
        })
    });

    const getActiveValidatorsData = await getActiveValidatorsResult.json();

    return getActiveValidatorsData.result.data;
}

async function getStakerByAddress(stakerAddress) {
    const getStakerByAddressResult = await fetch(JSON_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "jsonrpc": "2.0",
          "method": "getStakerByAddress",
          "params": [stakerAddress],
          "id": 1
        })
    });

    const getStakerByAddressData = await getStakerByAddressResult.json();

    return getStakerByAddressData.result ? getStakerByAddressData.result.data : null;
}

async function getAccountByAddress(accountAddress) {
    const getAccountByAddressResult = await fetch(JSON_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "jsonrpc": "2.0",
          "method": "getAccountByAddress",
          "params": [accountAddress],
          "id": 1
        })
    });

    const getAccountByAddressData = await getAccountByAddressResult.json();

    return getAccountByAddressData.result ? getAccountByAddressData.result.data : null;
}

async function getPoolValidator() {
    return await getValidatorByAddress(VALIDATOR_ADDRESS);
}

async function getValidatorByAddress(address) {
    const getValidatorByAddressResult = await fetch(JSON_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "jsonrpc": "2.0",
          "method": "getValidatorByAddress",
          "params": [address],
          "id": 1
        })
    });

    const getValidatorByAddressData = await getValidatorByAddressResult.json();

    return getValidatorByAddressData.result ? getValidatorByAddressData.result.data : null;
}

async function getPoolStakers() {
    return await getStakersByValidatorAddress(VALIDATOR_ADDRESS);
}

async function getStakersByValidatorAddress(address) {
    const getStakersByValidatorAddressResult = await fetch(
        JSON_RPC_URL,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getStakersByValidatorAddress',
            params: [address],
            id: 1,
          }),
        },
    );

    const getStakersByValidatorAddressData = await getStakersByValidatorAddressResult.json();

    return getStakersByValidatorAddressData.result.data;
}

async function getEpochNumber() {
    const getEpochNumberResult = await fetch(
        JSON_RPC_URL,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getEpochNumber',
            params: [],
            id: 1,
          }),
        },
    );

    const getEpochNumberData = await getEpochNumberResult.json();

    return getEpochNumberData.result.data;
}

async function getElectionBlockOf(epochNumber, prev = true) {
    const selectedEpochNumber = prev ? epochNumber - 1 : epochNumber;

    const getElectionBlockOfResult = await fetch(
        JSON_RPC_URL,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getElectionBlockOf',
            params: [selectedEpochNumber],
            id: 1,
          }),
        },
    );

    const getElectionBlockOfData = await getElectionBlockOfResult.json();

    return getElectionBlockOfData.result.data;
}

async function getLastElectionSlots() {
    const epochNumber = await getEpochNumber();
    const electionBlockNumber = await getElectionBlockOf(epochNumber, true);
    const block = await getBlockByNumber(electionBlockNumber);
    
    const slots = block.slots.sort((a, b) => b.numSlots - a.numSlots);

    return slots.map(slot => {
        return {
            validator: slot.validator,
            numSlots: slot.numSlots,
            firstSlotNumber: slot.firstSlotNumber
        };
    });
}

async function getTransactionByHash(hash) {
    const getTransactionByHashResult = await fetch(
        JSON_RPC_URL,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getTransactionByHash',
            params: [hash],
            id: 1,
          }),
        },
    );

    const getTransactionByHashData = await getTransactionByHashResult.json();

    return getTransactionByHashData.result ? getTransactionByHashData.result.data : null;
}

async function getBlockByNumber(blockNumber, includeBody = false) {
    const getBlockByNumberResult = await fetch(
        JSON_RPC_URL,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getBlockByNumber',
            params: [blockNumber, includeBody],
            id: 1,
          }),
        },
    );

    const getBlockByNumberData = await getBlockByNumberResult.json();

    return getBlockByNumberData.result ? getBlockByNumberData.result.data : null;
}

async function getBlockByNumberFromNimiqWatch(blockNumber) {
    const getBlockByNumberResult = await fetch(
        `${NIMIQ_WATCH_URL}/block/${blockNumber}`,
        {
          method: 'GET',
        },
    );

    const getBlockByNumberData = await getBlockByNumberResult.json();

    return getBlockByNumberData ? {
        number: getBlockByNumberData.height,
        hash: getBlockByNumberData.hash,
        size: getBlockByNumberData.size,
        timestamp: getBlockByNumberData.timestamp * 1000,
        transactions: getBlockByNumberData.transactions.map(tx => {
            return {
                hash: tx.hash,
                blockNumber: getBlockByNumberData.height,
                from: tx.sender_address,
                to: tx.receiver_address,
                value: tx.value,
                fee: tx.fee
            };
        })
    } : null;
}

// The hub has no getBlockByHash, so this goes straight to the node. The node
// answers with a "Block not found" error rather than an empty result when the
// hash belongs to something else (a transaction, say), which is treated as null.
async function getBlockByHashFromRPC(hash) {
    try {
        const getBlockByHashResult = await fetch(JSON_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'getBlockByHash',
                params: [hash, false],
                id: 1,
            }),
        });

        const getBlockByHashData = await getBlockByHashResult.json();

        return getBlockByHashData.result ? getBlockByHashData.result.data : null;
    } catch (error) {
        return null;
    }
}

async function getBlockByNumberFromNimiqHub(blockNumber) {
    const getBlockByNumberResult = await fetch(
        `${NIMIQ_HUB_URL}/getBlockByNumber/${blockNumber}`,
        {
          method: 'GET',
        },
    );

    const getBlockByNumberData = await getBlockByNumberResult.json();

    return getBlockByNumberData && getBlockByNumberData.data ? {
        number: getBlockByNumberData.data.number,
        hash: getBlockByNumberData.data.hash,
        size: getBlockByNumberData.data.size,
        timestamp: getBlockByNumberData.data.timestamp,
        transactions: getBlockByNumberData.data.transactions.map(tx => {
            return {
                hash: tx.hash,
                blockNumber: getBlockByNumberData.data.number,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                fee: tx.fee
            };
        })
    } : null;
}

async function getLatestBlocksFromNimiqWatch(limit) {
    const getLatestBlocksResult = await fetch(
        `${NIMIQ_WATCH_URL}/latest/${limit}/0`,
        {
          method: 'GET',
        },
    );

    const getLatestBlocksData = await getLatestBlocksResult.json();
    return getLatestBlocksData && getLatestBlocksData.length > 0 ? getLatestBlocksData.map(block => {
        return {
            blockNumber: block.height,
            size: block.size,
            type: block.height % 60 == 0 ? 'macro' : 'micro',
            timestamp: block.timestamp * 1000,
            txCount: block.transaction_count,
            producer: block.miner_address,
        };
    }) : [];
}

async function getTransactionsByAddressFromNimiqHub(address) {
    const getTransactionsByAddressResult = await fetch(
        `${NIMIQ_HUB_URL}/getTransactionsByAddress/${address}/200`,
        {
          method: 'GET',
        },
    );

    const getTransactionsByAddressData = await getTransactionsByAddressResult.json();

    if (getTransactionsByAddressData && getTransactionsByAddressData.data) {
        return getTransactionsByAddressData.data.map(tx => {
            return {
                hash: tx.hash,
                // size: tx.size,
                blockNumber: tx.blockNumber,
                from: tx.from,
                fromName: addressBook[tx.from] ? addressBook[tx.from].name : fShortenString(tx.from),
                fromAvatar: addressBook[tx.from] && addressBook[tx.from].logo ? addressBook[tx.from].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.from.replaceAll(' ', '+')}`,
                fromLink: `/wallet/${tx.from}`,
                to: tx.to,
                toName: addressBook[tx.to] ? addressBook[tx.to].name : fShortenString(tx.to),
                toAvatar: addressBook[tx.to] && addressBook[tx.to].logo ? addressBook[tx.to].logo : `https://v2.nimiqwatch.com/api/v1/iqon/${tx.to.replaceAll(' ', '+')}`,
                toLink: `/wallet/${tx.to}`,
                value: tx.value / 100000,
                fee: tx.fee / 100000,
                // validityStartHeight: tx.validityStartHeight,
                link: `/tx/${tx.hash}`
            };
        });
    } else {
        return [];
    }
}

async function getTransactionByHashFromNimiqHub(hash) {
    const getTransactionByHashResult = await fetch(
        `${NIMIQ_HUB_URL}/getTransactionByHash/${hash}`,
        {
          method: 'GET',
        },
    );

    const getTransactionByHashData = await getTransactionByHashResult.json();

    return getTransactionByHashData && getTransactionByHashData.data ? {
        hash: getTransactionByHashData.data.hash,
        blockNumber: getTransactionByHashData.data.blockNumber,
        from: getTransactionByHashData.data.from,
        to: getTransactionByHashData.data.to,
        value: getTransactionByHashData.data.value,
        fee: getTransactionByHashData.data.fee,
        validityStartHeight: getTransactionByHashData.data.validityStartHeight,
        confirmations: getTransactionByHashData.data.confirmations,
        timestamp: getTransactionByHashData.data.timestamp,
    } : null;
}

async function getTransactionByHashFromNimiqWatch(hash) {
    const getTransactionByHashResult = await fetch(
        `${NIMIQ_WATCH_URL}/transaction/${hash}`,
        {
          method: 'GET',
        },
    );

    const getTransactionByHashData = await getTransactionByHashResult.json();

    return getTransactionByHashData ? {
        hash: getTransactionByHashData.hash,
        blockNumber: getTransactionByHashData.block_height,
        from: getTransactionByHashData.sender_address,
        to: getTransactionByHashData.receiver_address,
        value: getTransactionByHashData.value,
        fee: getTransactionByHashData.fee,
        validityStartHeight: getTransactionByHashData.validity_start_height,
        confirmations: getTransactionByHashData.confirmations,
        timestamp: getTransactionByHashData.timestamp * 1000,
    } : null;
}

async function getTransactionByHash(hash) {
    const getTransactionByHashResult = await fetch(
        JSON_RPC_URL,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'getTransactionByHash',
            params: [hash],
            id: 1,
          }),
        },
    );

    const getTransactionByHashData = await getTransactionByHashResult.json();

    return getTransactionByHashData.result ? getTransactionByHashData.result.data : null;
}

async function getStakerDailyRewards(address) {
    const [dailyRewards] = await pool.query(
        `SELECT 
            DATE(created_at) AS reward_date,
            SUM(rewards) AS total_rewards
        FROM 
            pool.staker_rewards 
        WHERE 
            staker = ? 
            AND created_at >= CURDATE() - INTERVAL 30 DAY 
            AND created_at < CURDATE() 
        GROUP BY 
            reward_date, staker
        ORDER BY 
            reward_date ASC`,
        [address]
    );

    return dailyRewards;
}

async function getStakerTodayRewards(address) {
    const [todayRewards] = await pool.query(
        `SELECT 
            SUM(rewards) AS today_rewards
        FROM 
            pool.staker_rewards
        WHERE 
            staker = ?
            AND created_at >= CURDATE()
            AND created_at < CURDATE() + INTERVAL 1 DAY`,
        [address]
    );

    return todayRewards[0].today_rewards;
}

async function getStakerLast30DaysRewards(address) {
    const [last30DaysRewards] = await pool.query(
        `SELECT 
            SUM(rewards) AS last_30_days_rewards
        FROM 
            pool.staker_rewards 
        WHERE 
            staker = ? 
            AND created_at >= CURDATE() - INTERVAL 30 DAY 
            AND created_at < CURDATE()`,
        [address]
    );

    return last30DaysRewards[0].last_30_days_rewards;
}

async function getStakerTotalRewards(address) {
    const [stakerTotalRewards] = await pool.query(
        'SELECT total_rewards, lifetime_rewards FROM pool.staker_total_rewards WHERE staker = ?',
        [address],
    );

    return {
        pendingPayout: stakerTotalRewards[0].total_rewards,
        totalRewards: stakerTotalRewards[0].lifetime_rewards,
    };
}

async function getPriceInfo() {
    const [priceInfo] = await pool.query(
        'SELECT `price`, `price_change`, `volume`, `volume_change`, `market_cap`, `rank`, `created_at` FROM `nimiq`.`price` ORDER BY `id` DESC LIMIT 25',
    );

    priceInfo.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return priceInfo.map(price => {
        return {
            datetime: formatTo12HourTime(price.created_at),
            price: price.price,
            priceChange: price.price_change,
            volume: price.volume,
            volumeChange: price.volume_change,
            marketCap: price.market_cap,
            rank: price.rank
        };
    });
}

async function getTodayActiveUsers() {
    const [todayActiveUsers] = await pool.query(
        'SELECT total_senders, total_receivers FROM nimiq.blockchain_info ORDER BY date DESC LIMIT 1',
    );

    return {
        totalSenders: todayActiveUsers[0].total_senders,
        totalReceivers: todayActiveUsers[0].total_receivers,
    };
}

async function getStakerRewards(address) {
    const [rewards] = await pool.query(
        'SELECT epoch, rewards, created_at FROM pool.staker_rewards WHERE staker = ? order by id desc limit 120',
        [address]
    );

    return rewards;
}

async function getStakerSettings(address) {
    const [stakerSettings] = await pool.query(
        'SELECT payout_type FROM pool.staker_settings WHERE staker = ?',
        [address]
    );

    return stakerSettings[0] ? stakerSettings[0].payout_type : null;
}

async function updateStakerSettings(address, payoutType) {
    try {
        await pool.query(
            'INSERT INTO pool.staker_settings (`staker`, `pool_fee`, `payout_type`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `payout_type` = ?',
            [address, DEFAULT_POOL_FEE, payoutType, payoutType],
        );
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getStakerPayouts(address) {
    const [payouts] = await pool.query(
        'SELECT tx_hash, epoch, rewards, payout_type, created_at FROM pool.payouts WHERE staker = ? order by id desc limit 120',
        [address]
    );

    return payouts;
}

async function getPoolRewards() {
    const [rewards] = await pool.query(
        'SELECT tx_hash, block_number, epoch, value, created_at FROM pool.rewards order by id desc limit 360',
    );

    return rewards;
}

async function getPayoutHistory() {
    const [payouts] = await pool.query(
        'SELECT tx_hash, epoch, staker, rewards, payout_type, created_at FROM pool.payouts order by id desc limit 360',
    );

    return payouts;
}

async function getStakerTotalRewardsPayoutType() {
    const [stakerTotalRewards] = await pool.query(
        'SELECT staker, total_rewards, created_at FROM pool.staker_total_rewards',
    );

    let stakerTotalRewardMapping = {};
    let stakerJoinDateMapping = {};
    if (stakerTotalRewards.length > 0) {
        stakerTotalRewards.forEach(stakerTotalReward => {
            stakerTotalRewardMapping[stakerTotalReward.staker] = stakerTotalReward.total_rewards / 100000;
            stakerJoinDateMapping[stakerTotalReward.staker] = stakerTotalReward.created_at;
        });
    }

    const [stakerSettings] = await pool.query(
        'SELECT staker, payout_type FROM pool.staker_settings',
    );
    const stakerPayoutTypeMapping = {};
    stakerSettings.forEach(stakerSetting => {
        stakerPayoutTypeMapping[stakerSetting.staker] = (stakerSetting.payout_type == PAYOUT_TYPE_RESTAKE) ? PAYOUT_TYPE_RESTAKE_TEXT : PAYOUT_TYPE_PAYOUT_TEXT;
    });

    return {
        stakerTotalRewardMapping,
        stakerPayoutTypeMapping,
        stakerJoinDateMapping
    }
}

function _formatDatetimeFromString(datetime) {
    const d = new Date(datetime),
        month = '0' + (d.getMonth()+1),
        day = '0' + d.getDate(),
        year = d.getFullYear(),
        hours = '0' + d.getHours(),
        minutes = "0" + d.getMinutes(),
        seconds = "0" + d.getSeconds();

    return year + '-' + month.substr(-2) + '-' + day.substr(-2) + ' ' + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}

function getTimestampFromString(datetime) {
    const d = new Date(datetime);

    return d.getTime() / 1000;
}

function _formatDatetime(timestamp) {
    const d = new Date(timestamp * 1000),
        month = '0' + (d.getMonth()+1),
        day = '0' + d.getDate(),
        year = d.getFullYear(),
        hours = '0' + d.getHours(),
        minutes = "0" + d.getMinutes(),
        seconds = "0" + d.getSeconds();

    return year + '-' + month.substr(-2) + '-' + day.substr(-2) + ' ' + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}

function formatTo12HourTime(dateInput) {
    const date = new Date(dateInput); // Convert input to Date object
  
    let hours = date.getHours(); // Get hours
    const minutes = date.getMinutes(); // Get minutes
    const ampm = hours >= 12 ? 'PM' : 'AM'; // Determine AM/PM
    hours = hours % 12; // Convert 24-hour time to 12-hour
    hours = hours || 12; // Handle midnight as 12
    const formattedMinutes = minutes.toString().padStart(2, '0'); // Pad minutes to 2 digits
  
    return `${hours}:${formattedMinutes} ${ampm}`;
  }

function fShortenString(inputValue) {
    const firstPart = inputValue.slice(0, 4);
    const lastPart = inputValue.slice(-4);
  
    return `${firstPart} ••• ${lastPart}`;
  }

function _formatBytes(bytes,decimals) {
    if(bytes == 0) return '0 Bytes';
    var k = 1000,
        dm = decimals || 2,
        sizes = ['H', 'KH', 'MH', 'GH', 'TH', 'PH', 'EH', 'ZH', 'YH'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return {
        'number': parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
        'unit': sizes[i]
    };
}

function _posSupplyAt(timestampMs) {
    const TOTAL_SUPPLY = 21e14;
    const PROOF_OF_STAKE_FORK_DATE = new Date('2024-11-19T16:45:20.000Z');
    const SUPPLY_AT_PROOF_OF_STAKE_FORK_DATE = 12893109654.06244;
    const SUPPLY_DECAY = 0.9999999999960264;

    const ts = timestampMs - PROOF_OF_STAKE_FORK_DATE.getTime()
    if (ts < 0)
      throw new Error('currentTime must be greater or equal to genesisTime')
    return Math.round((TOTAL_SUPPLY - ((TOTAL_SUPPLY - SUPPLY_AT_PROOF_OF_STAKE_FORK_DATE * 1e5) * _powi(SUPPLY_DECAY, ts))) / 1e5)
}

function _powi(x, n) {
    if (n < 0) {
        x = 1 / x;
        n *= -1;
    }
    if (!n) return 1;
    let y = 1;
    while (n > 1) {
        if (n % 2) {
            y *= x;
            n -= 1;
        }
        x *= x;
        n /= 2;
    }
    return x * y;
}

function generateToken(address) {
    return jwt.sign({ address }, JWT_SECRET, { expiresIn: '30d' });
}

function verifySignature(signerPublicKey, signature, message) {
    try {
        const deserializedSignature = Nimiq.Signature.deserialize(signature);
        const publicKey = new Nimiq.PublicKey(signerPublicKey);
    
        const data = HubApi.MSG_PREFIX
                    + message.length
                    + message;

        const dataBytes = Nimiq.BufferUtils.fromUtf8(data);
        const hash = Nimiq.Hash.computeSha256(dataBytes);
    
        const isValid = publicKey.verify(deserializedSignature, hash);
    
        return isValid;
    } catch (error) {
        console.error(error);
        return false;
    }
}

function fAddressInfo(address) {
    const addressInfo = addressBook[address];
  
    let name = '';
    if (addressInfo && addressInfo.name) {
      name = addressInfo.name.length > 20 ? fShortenString(addressInfo.name) : addressInfo.name;
    }
  
    return name ? {
      ...addressInfo,
      name,
    } : null;
  };

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied.' });
  
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token.' });
      req.user = user;
      next();
    });
  }

app.options('*', cors());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
