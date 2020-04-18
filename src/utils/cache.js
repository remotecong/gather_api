const Sentry = require("@sentry/node");
const redis = require("redis");
const { promisify } = require("bluebird");
const client = redis.createClient({
  host: "redis",
});

const _getVal = promisify(client.get, { context: client });
const _setVal = promisify(client.setex, { context: client });

const getCachedJSON = async (id) => {
  try {
    const data = await _getVal(id);
    return JSON.parse(data);
  } catch (err) {
    Sentry.captureException(err);
    return null;
  }
};

const cacheJSON = async (id, data) => {
  try {
    return await _setVal(id, 3600 * 36, JSON.stringify(data));
  } catch (err) {
    Sentry.captureException(err);
  }
};

module.exports = {
  getCachedJSON,
  cacheJSON,
};
