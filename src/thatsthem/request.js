const Sentry = require("@sentry/node");
const axios = require("axios");
const { getFetcher, resetIp, kill: killTor } = require("../utils/tor.js");

let torAx;

//  will be set to when we can try the next local ip request (1 day from ratelimit)
let waitUntil = 0;

const defaultAxiosOptions = {
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:75.0) Gecko/20100101 Firefox/75.0",
  },
};

//  local ip requests
const localAxios = axios.create(defaultAxiosOptions);

async function getTorax() {
  console.log("TOR: spinning up a new TOR");
  if (!torAx) {
    torAx = await getFetcher(defaultAxiosOptions);
  }

  return torAx;
}

function isRateLimited(response) {
  return response.status === 302 || response.status === 403 ||
    response.headers["location"] === "/?rl=true" ||
    /exceeded the maximum number of queries|<b>Fatal error<\/b>/
      .test(response.data);
}

async function fetch(url) {
  let ax = axios;

  if (waitUntil) {
    //  if still same day we received RL, use diff IP
    if (Date.now() < waitUntil) {
      ax = await getTorax();
    // else use local IP again
    } else {
      console.log("TOR: returning from TOR to local IP because time's up");
      waitUntil = 0;
      killTor();
    }
  }

  let response;
  try {
    response = await ax.get(url);
  } catch (err) {
    response = err.response;
  }

  if (isRateLimited(response)) {
    console.log("RATE LIMIT RESPONSE, TRY 1");
    //  retry one more time with new ip
    if (waitUntil) {
      console.log("TOR: got rate limit response, trying new IP");
      //  we were already trying tor
      await resetIp();
    } else {
      //  we need to try tor for a day
      waitUntil = Date.now() + (1000 * 60 * 60 * 24);
      ax = await getTorax();
    }

    //  last try
  try {
    response = await ax.get(url);
  } catch (err) {
    response = err.response;
  }


    if (isRateLimited(response)) {
      console.log("RATE LIMIT: blocked by multiple rate limit errors");
      throw new Error("multiple thatsthem rate limits raised");
    }
  }

  return response.data;
}

async function getThatsThemData(url) {
  Sentry.configureScope((scope) => {
    scope.setTag("tt_url", url);
  });

  return await fetch(url);
}

module.exports = {
  getThatsThemData,
};

