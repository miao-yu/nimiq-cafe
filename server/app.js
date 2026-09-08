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
const { issueChallenge, consumeChallenge } = require('./challenge');
const portfolio = require('./portfolio');

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

// Shared with reef.nimiq.cafe. A cookie is the only browser store that crosses
// subdomains -- sessionStorage and localStorage are per-origin -- so scoping it
// to the parent domain is what lets one sign-in cover both apps. Reef signs the
// same HS256 {address} payload with the same secret, so either side's token
// verifies on the other.
const SESSION_COOKIE = 'nimiq_cafe_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Unset outside production: a Domain of .nimiq.cafe is rejected on localhost,
// which would silently drop the cookie in development.
const SESSION_COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN
    || (process.env.NODE_ENV === 'PROD' ? '.nimiq.cafe' : undefined);

function setSessionCookie(res, token) {
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        // Blocks the cross-site POSTs that a cookie would otherwise expose
        // /api/settings and /api/portfolio/addresses to.
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'PROD',
        path: '/',
        maxAge: SESSION_MAX_AGE_MS,
        ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
    });
}

function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'PROD',
        path: '/',
        ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
    });
}
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

// Step one of sign-in: hand out a random, single-use message to sign. The
// client never chooses what gets signed, so a signature cannot be prepared in
// advance or replayed.
app.post('/api/auth/challenge', (req, res) => {
    try {
        const { code, message, expiresAt } = issueChallenge();
        res.status(200).json({ code, message, expiresAt });
    } catch (error) {
        console.error(error);
        res.status(503).json({ message: 'Could not issue a challenge. Try again.' });
    }
});

// Step two: the signature over that message. The message is looked up by code
// rather than taken from the request, so the only thing that can be signed
// here is something this server issued in the last five minutes.
app.post('/api/auth/sign-in', async (req, res) => {
    const { code, publicKey, signature, signer } = req.body;

    if (typeof code !== 'string' || typeof publicKey !== 'string'
        || typeof signature !== 'string' || typeof signer !== 'string') {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const challenge = consumeChallenge(code);
    if (!challenge) {
      return res.status(400).json({ message: 'That sign-in request expired or was already used. Try again.' });
    }

    const address = verifySignedMessage(publicKey, signature, challenge.message, signer);
    if (!address) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Registers the address for daily snapshots and gives it a bundle. Failing
    // here must not fail the sign-in -- the portfolio degrades, auth does not.
    try {
      await portfolio.touchAccount(pool, address);
    } catch (error) {
      console.error('touchAccount failed:', error.message);
    }

    // The token is issued for the address derived from the key, never for the
    // `signer` the request asked for.
    const accessToken = generateToken(address);

    // Both: the header keeps working for this SPA, the cookie is what Reef sees.
    setSessionCookie(res, accessToken);

    res.status(200).json({ accessToken });
  });

/**
 * Who the caller is, from either the header or the shared cookie.
 *
 * This exists for arrivals from reef.nimiq.cafe: the cookie is httpOnly, so
 * the front end cannot read it and would otherwise render as signed out even
 * though every API call would have succeeded. Returns the address only -- not
 * the token -- so the cookie stays out of JavaScript's reach.
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.status(200).json({ address: req.user.address });
});

/** Clears the shared cookie. JavaScript cannot, since it is httpOnly. */
app.post('/api/auth/sign-out', (req, res) => {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
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

// ---------------------------------------------------------------------------
// Portfolio
//
// Private in the sense that it is *yours* -- the address comes from the token,
// never from the URL, so there is no per-address portfolio to enumerate. The
// underlying data is public on the chain either way; what the sign-in buys is
// not having to type an address, and the bundle of addresses below.
// ---------------------------------------------------------------------------

const LUNA = 100000;

/** Chain state for one address, shaped for the portfolio view. */
async function portfolioAccount(address) {
    const [account, staker] = await Promise.all([
        getAccountByAddress(address),
        getStakerByAddress(address).catch(() => null),
    ]);

    if (!account) {
        // An address that has never received NIM has no account on chain. It
        // is a real, empty address rather than an error.
        return {
            address,
            name: fAddressInfo(address) ? fAddressInfo(address).name : fShortenString(address),
            liquid: 0, staked: 0, inactive: 0, retired: 0,
            validator: null,
            onChain: false,
        };
    }

    let validator = null;
    if (staker && staker.delegation) {
        const delegate = await getValidatorByAddress(staker.delegation).catch(() => null);
        const info = fAddressInfo(staker.delegation);
        validator = {
            address: staker.delegation,
            name: info ? info.name : fShortenString(staker.delegation),
            avatar: info && info.logo
                ? info.logo
                : `${NIMIQ_WATCH_URL.replace('/api/v1', '')}/api/v1/iqon/${staker.delegation.replaceAll(' ', '+')}`,
            addressLink: `/wallet/${staker.delegation}`,
            balance: delegate ? delegate.balance / LUNA : null,
            isNimiqCafe: staker.delegation.replace(/\s+/g, '') === VALIDATOR_ADDRESS.replace(/\s+/g, ''),
        };
    }

    return {
        address,
        name: fAddressInfo(address) ? fAddressInfo(address).name : fShortenString(address),
        liquid: (account.balance || 0) / LUNA,
        staked: staker ? (staker.balance || 0) / LUNA : 0,
        inactive: staker ? (staker.inactiveBalance || 0) / LUNA : 0,
        retired: staker ? (staker.retiredBalance || 0) / LUNA : 0,
        validator,
        onChain: true,
    };
}

/**
 * What a tier-2 visitor -- staking, but not here -- is shown instead of the
 * reward history we cannot have for them. Their own fee against ours, and what
 * the difference is worth on the stake they already hold.
 */
async function portfolioPitch(accounts) {
    const staked = accounts.filter((a) => a.validator && !a.validator.isNimiqCafe);
    if (!staked.length) {
        return null;
    }

    let validators = [];
    try {
        validators = JSON.parse(await fsPromise.readFile(__dirname + '/json/validators.json', 'utf-8'));
    } catch (error) {
        // Written by cron; missing is survivable, the pitch just loses its numbers.
        console.error('portfolioPitch: validators.json unavailable');
    }

    const byAddress = {};
    validators.forEach((validator) => { byAddress[validator.address] = validator; });

    const ours = byAddress[VALIDATOR_ADDRESS];
    const totalStaked = staked.reduce((sum, a) => sum + a.staked + a.inactive, 0);

    const current = staked.map((account) => {
        const theirs = byAddress[account.validator.address];
        return {
            address: account.address,
            validatorName: account.validator.name,
            fee: theirs && theirs.fee !== undefined ? Number(theirs.fee) : null,
            staked: account.staked + account.inactive,
        };
    });

    // Only the fees that are actually known; an unknown one is left out rather
    // than assumed to be zero, which would understate the difference.
    const known = current.filter((entry) => entry.fee !== null);
    const weightedFee = known.length && totalStaked
        ? known.reduce((sum, entry) => sum + entry.fee * entry.staked, 0) / known.reduce((sum, e) => sum + e.staked, 0)
        : null;

    return {
        totalStaked,
        current,
        ourFee: ours && ours.fee !== undefined ? Number(ours.fee) : DEFAULT_POOL_FEE,
        weightedFee,
        // Deliberately not an APY projection: rewards depend on election luck
        // and total stake, and a made-up number here would be the least
        // trustworthy thing on the page.
        feeDifference: weightedFee === null ? null : weightedFee - (ours && ours.fee !== undefined ? Number(ours.fee) : DEFAULT_POOL_FEE),
    };
}

app.get('/api/portfolio', authenticateToken, async function(req, res) {
    try {
        const signedInAddress = portfolio.canonical(req.user.address);

        // Self-heals a session older than this table, and is what actually
        // enrols most people in the daily snapshot -- a 30-day token means
        // sign-in may be weeks in the past.
        try {
            await portfolio.touchAccount(pool, signedInAddress);
        } catch (error) {
            console.error('touchAccount failed:', error.message);
        }

        let addresses = [signedInAddress];
        try {
            addresses = await portfolio.getBundleAddresses(pool, signedInAddress);
        } catch (error) {
            // A missing bundle must not blank the page -- fall back to the one
            // address the token proves.
            console.error('getBundleAddresses failed:', error.message);
        }

        const accounts = await Promise.all(addresses.map(portfolioAccount));

        const totals = accounts.reduce((sum, account) => ({
            liquid: sum.liquid + account.liquid,
            staked: sum.staked + account.staked,
            inactive: sum.inactive + account.inactive,
            retired: sum.retired + account.retired,
        }), { liquid: 0, staked: 0, inactive: 0, retired: 0 });
        totals.total = totals.liquid + totals.staked + totals.inactive + totals.retired;

        const withUs = accounts.filter((a) => a.validator && a.validator.isNimiqCafe);
        const anyStake = accounts.some((a) => a.staked + a.inactive + a.retired > 0);

        // 1 account only, 2 staking elsewhere, 3 staking with us.
        const tier = withUs.length ? 3 : anyStake ? 2 : 1;

        const [priceInfo, history] = await Promise.all([
            getPriceInfo().catch(() => null),
            portfolio.getSnapshots(pool, addresses, 90).catch((error) => {
                console.error('getSnapshots failed:', error.message);
                return [];
            }),
        ]);

        // Snapshots are per address per day; the chart wants one series.
        const byDate = {};
        history.forEach((row) => {
            const date = row.snapshot_date instanceof Date
                ? row.snapshot_date.toISOString().slice(0, 10)
                : String(row.snapshot_date).slice(0, 10);
            const entry = byDate[date] || (byDate[date] = { date, liquid: 0, staked: 0, inactive: 0, retired: 0, nimUsd: null });
            entry.liquid += Number(row.liquid) / LUNA;
            entry.staked += Number(row.staked) / LUNA;
            entry.inactive += Number(row.inactive) / LUNA;
            entry.retired += Number(row.retired) / LUNA;
            if (row.nim_usd !== null) entry.nimUsd = Number(row.nim_usd);
        });
        const series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

        let rewards = null;
        let payouts = null;
        if (tier === 3) {
            const perAddress = await Promise.all(withUs.map(async (account) => {
                const [total, today, last30, list] = await Promise.all([
                    getStakerTotalRewards(account.address).catch(() => 0),
                    getStakerTodayRewards(account.address).catch(() => 0),
                    getStakerLast30DaysRewards(account.address).catch(() => 0),
                    getStakerDailyRewards(account.address).catch(() => []),
                ]);
                return { address: account.address, total, today, last30, daily: list };
            }));

            const daily = {};
            perAddress.forEach((entry) => {
                (entry.daily || []).forEach((row) => {
                    const date = row.reward_date instanceof Date
                        ? row.reward_date.toISOString().slice(0, 10)
                        : String(row.reward_date).slice(0, 10);
                    daily[date] = (daily[date] || 0) + Number(row.total_rewards || 0) / LUNA;
                });
            });

            rewards = {
                total: perAddress.reduce((sum, e) => sum + Number(e.total || 0), 0) / LUNA,
                today: perAddress.reduce((sum, e) => sum + Number(e.today || 0), 0) / LUNA,
                last30Days: perAddress.reduce((sum, e) => sum + Number(e.last30 || 0), 0) / LUNA,
                daily: Object.keys(daily).sort().map((date) => ({ date, rewards: daily[date] })),
            };

            const lists = await Promise.all(withUs.map((a) => getStakerPayouts(a.address).catch(() => [])));
            payouts = lists.flat();
        }

        res.json({
            signedInAddress,
            addresses,
            tier,
            accounts,
            totals,
            // getPriceInfo returns the last 25 points, oldest first; the
            // portfolio only needs the current one.
            price: Array.isArray(priceInfo) && priceInfo.length ? priceInfo[priceInfo.length - 1] : null,
            history: series,
            rewards,
            payouts,
            pitch: tier === 2 ? await portfolioPitch(accounts) : null,
        });
    } catch (error) {
        console.error('GET /api/portfolio failed:', error);
        res.status(500).json({ message: 'Could not load your portfolio.' });
    }
});

/**
 * Add another address to the bundle. Proving control of it is the whole
 * authorisation: the caller signs a challenge with the address being added, so
 * this reuses the sign-in machinery rather than inventing a second one.
 */
app.post('/api/portfolio/addresses', authenticateToken, async function(req, res) {
    const { code, publicKey, signature, signer } = req.body;

    if (typeof code !== 'string' || typeof publicKey !== 'string'
        || typeof signature !== 'string' || typeof signer !== 'string') {
      return res.status(400).json({ message: 'Invalid request.' });
    }

    const challenge = consumeChallenge(code);
    if (!challenge) {
      return res.status(400).json({ message: 'That request expired or was already used. Try again.' });
    }

    const candidate = verifySignedMessage(publicKey, signature, challenge.message, signer);
    if (!candidate) {
      return res.status(400).json({ message: 'That signature did not verify.' });
    }

    try {
        // The owner may have signed in before this table existed, in which case
        // it has no bundle to link into yet.
        await portfolio.touchAccount(pool, req.user.address);

        const result = await portfolio.linkAddress(pool, req.user.address, candidate);
        if (!result.ok) {
            const messages = {
                'same-address': 'That address is already the one you are signed in with.',
                'already-linked': 'That address is already in your portfolio.',
                'in-another-bundle': 'That address is grouped with other addresses already. Remove it there first.',
                'unknown-owner': 'Sign in again and retry.',
            };
            return res.status(400).json({ message: messages[result.reason] || 'Could not add that address.' });
        }
        res.status(200).json({ address: candidate });
    } catch (error) {
        console.error('linkAddress failed:', error);
        res.status(500).json({ message: 'Could not add that address.' });
    }
});

/** Remove an address from the bundle. It keeps its own history and can sign in alone. */
app.delete('/api/portfolio/addresses/:address', authenticateToken, async function(req, res) {
    try {
        const result = await portfolio.unlinkAddress(pool, req.user.address, req.params.address);
        if (!result.ok) {
            const messages = {
                'cannot-remove-self': 'You cannot remove the address you are signed in with.',
                'not-in-bundle': 'That address is not in your portfolio.',
            };
            return res.status(400).json({ message: messages[result.reason] || 'Could not remove that address.' });
        }
        res.status(200).json({ address: portfolio.canonical(req.params.address) });
    } catch (error) {
        console.error('unlinkAddress failed:', error);
        res.status(500).json({ message: 'Could not remove that address.' });
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

// /dashboard became /network. It was the domain root's canonical for a few
// hours and is the kind of URL people bookmark, so it redirects rather than
// 404s. Permanent, because the move is. Above the catch-all, which would
// otherwise answer it with the SEO shell and a noindex.
app.get('/dashboard', (req, res) => {
    res.redirect(301, '/network');
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

// Nimiq addresses are compared in their canonical spaced uppercase form.
function normalizeAddress(address) {
    return String(address).replace(/\s+/g, '').toUpperCase();
}

/**
 * Verify wallet ownership, and return the address that was proven -- not the
 * one the caller claimed. Both halves are mandatory:
 *
 *   1. the signature is valid for the supplied public key, and
 *   2. that public key derives to the address being claimed.
 *
 * Without (2) a signature only proves the caller owns *some* wallet. They
 * could sign any message with their own key, send `signer` set to someone
 * else's address, and be handed that address's token.
 *
 * The framing is what the Nimiq Hub and Nimiq Pay both produce:
 * SHA-256(MSG_PREFIX + byteLength + message). byteLength, not String.length --
 * the two agree only while the message stays ASCII.
 */
function verifySignedMessage(publicKeyHex, signatureHex, message, claimedAddress) {
    try {
        // Hex, because that is what the Mini App provider returns natively and
        // what the Hub path converts to -- one representation, no guessing.
        const publicKey = Nimiq.PublicKey.fromHex(publicKeyHex);
        const deserializedSignature = Nimiq.Signature.fromHex(signatureHex);

        const data = HubApi.MSG_PREFIX
                    + Buffer.byteLength(message, 'utf8')
                    + message;

        const dataBytes = Nimiq.BufferUtils.fromUtf8(data);
        const hash = Nimiq.Hash.computeSha256(dataBytes);

        if (!publicKey.verify(deserializedSignature, hash)) {
            return null;
        }

        const derived = publicKey.toAddress().toUserFriendlyAddress();
        if (normalizeAddress(derived) !== normalizeAddress(claimedAddress)) {
            return null;
        }

        return derived;
    } catch (error) {
        console.error(error);
        return null;
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
    // Header first, because this app's own SPA sends one and a header cannot be
    // driven cross-site. The cookie is the fallback that carries a session in
    // from reef.nimiq.cafe.
    const token = req.headers['authorization']?.split(' ')[1]
        || (req.cookies && req.cookies[SESSION_COOKIE]);
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
