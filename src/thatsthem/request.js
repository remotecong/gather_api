const Sentry = require("@sentry/node");
const axios = require("axios");
const { getFetcher, resetIp, kill: killTor } = require("../utils/tor.js");
const { USER_AGENT } = require("../utils/config.js");

let torAx;

//  will be set to when we can try the next local ip request (1 day from ratelimit)
let waitUntil = 0;

const defaultAxiosOptions = {
  headers: {
    "User-Agent": USER_AGENT,
  },
};

//  local ip requests
const localAxios = axios.create(defaultAxiosOptions);

async function getTorax() {
  if (!torAx) {
    torAx = await getFetcher(defaultAxiosOptions);
  }

  return torAx;
}

function isRateLimited(response) {
  return (
    response.status === 302 ||
    response.status === 403 ||
    response.headers["location"] === "/?rl=true" ||
    /exceeded the maximum number of queries|<b>Fatal error<\/b>/.test(response.data)
  );
}

async function fetch(url) {
  let ax = localAxios;

  if (waitUntil) {
    //  if still same day we received RL, use diff IP
    if (Date.now() < waitUntil) {
      ax = await getTorax();
      // else use local IP again
    } else {
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
    console.log("thatsthem rate limit hit");
    //  retry one more time with new ip
    if (waitUntil) {
      //  we were already trying tor
      await resetIp();
    } else {
      //  we need to try tor for a day
      // prettier-ignore
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
      console.error("thatsthem multiple rate limits hit");
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
