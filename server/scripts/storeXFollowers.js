// Records the follower count of the @nimiq account.
//
// The official X API v2 endpoint this used to call now returns
// 402 "credits depleted", so the count stopped being recorded on 2026-03-31.
// This instead uses the same unauthenticated guest-token path that x.com's own
// web client uses for logged-out visitors, which still serves the public
// follower count for free.
//
// Caveats, in case this breaks again:
//   - GRAPHQL_QUERY_ID is part of an x.com build and changes when they ship a
//     new one. A 404 from the GraphQL call almost certainly means it moved;
//     grab the current id from a logged-out browser's network tab.
//   - This is an undocumented endpoint, so treat it as best-effort.
// Failures exit non-zero and log to stderr rather than failing silently.

const mysql = require('mysql');
const { nimiqCredentials } = require('../db-config');

const USERNAME = 'nimiq';

// Public bearer token shipped in the x.com web client for logged-out requests.
const BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const GRAPHQL_QUERY_ID = 'qW5u-DAuXpMEG0zA1F7UGQ';

// Required: X answers 404 "that page does not exist" to node's default agent.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FEATURES = {
  hidden_profile_subscriptions_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
  subscriptions_feature_can_gift_premium: true,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
};

async function getGuestToken() {
  const response = await fetch('https://api.x.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${BEARER}`, 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`guest token request failed: HTTP ${response.status}`);
  }

  const { guest_token: guestToken } = await response.json();

  if (!guestToken) {
    throw new Error('guest token missing from response');
  }

  return guestToken;
}

async function getFollowerCount(username) {
  const guestToken = await getGuestToken();

  const url =
    `https://api.x.com/graphql/${GRAPHQL_QUERY_ID}/UserByScreenName` +
    `?variables=${encodeURIComponent(JSON.stringify({ screen_name: username }))}` +
    `&features=${encodeURIComponent(JSON.stringify(FEATURES))}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${BEARER}`,
      'x-guest-token': guestToken,
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`UserByScreenName failed: HTTP ${response.status}`);
  }

  const body = await response.json();
  const followers = body?.data?.user?.result?.legacy?.followers_count;

  if (typeof followers !== 'number' || followers <= 0) {
    throw new Error(`no follower count in response: ${JSON.stringify(body).slice(0, 300)}`);
  }

  return followers;
}

function formatDatetime(date) {
  const d = date,
    month = '0' + (d.getMonth() + 1),
    day = '0' + d.getDate(),
    year = d.getFullYear();

  return year + '-' + month.substr(-2) + '-' + day.substr(-2);
}

(async () => {
  let followersCount;

  try {
    followersCount = await getFollowerCount(USERNAME);
  } catch (error) {
    console.error(`Failed to fetch @${USERNAME} followers: ${error.message}`);
    process.exit(1);
  }

  const connection = mysql.createConnection(nimiqCredentials({ database: 'nimiq' }));

  connection.connect();

  connection.query(
    'INSERT INTO `socialmedia_info` (`date`, `x_followers`) VALUES (?,?) ON DUPLICATE KEY UPDATE `x_followers` = ?',
    [formatDatetime(new Date()), followersCount, followersCount],
    (error) => {
      connection.end();

      if (error) {
        console.error(`Failed to store followers: ${error.message}`);
        process.exit(1);
      }

      console.log(`DONE (${followersCount} followers)`);
    }
  );
})();
