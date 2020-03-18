const Sentry = require("@sentry/node");
const redis = require("redis");
const { promisify } = require("bluebird");
const client = redis.createClient({
  host: "redis"
});

const _getVal = promisify(client.get, { context: client });
const _setVal = promisify(client.setex, { context: client });

const getCachedSearch = async address => {
  try {
    const data = await _getVal(address);
    return JSON.parse(data);
  } catch (err) {
    Sentry.captureException(err);
    return null;
  }
};

const cacheSearch = async (address, results) => {
  try {
    return _setVal(address, 3600, JSON.stringify(results));
  } catch (err) {
    Sentry.captureException(err);
  }
};

module.exports = {
  getCachedSearch,
  cacheSearch
};
