const Sentry = require("@sentry/node");
const { getPhoneNumbers, getThatsThemUrl } = require("./thatsthem");
const { getCachedJSON, cacheJSON } = require("./utils/cache.js");
const getOwnerData = require("./owner-lookups/tulsa/assessor");
const { infoFilter } = require("./utils/infoFilter.js");

function timeout(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error("timeout error")), seconds << 10);
  });
}

module.exports = async address => {
  if (!address) {
    return { error: "Missing address" };
  }

  const cachedResults = await getCachedJSON(address);
  if (cachedResults) {
    return cachedResults;
  }

  try {
    const [ownerData, thatsThemData] = await Promise.race([
      Promise.all([getOwnerData(address), getPhoneNumbers(address)]),
      timeout(14)
    ]);

    const results = {
      thatsThemUrl: getThatsThemUrl(address),
      ...infoFilter(ownerData, thatsThemData)
    };

    //  not caching if thatsthem fails to load
    if (thatsThemData.length) {
      cacheJSON(address, results);
    }

    return results;
  } catch (err) {
    const captureError = new Error(err.message + " " + address);
    Sentry.withScope(scope => {
      scope.setTag("query", address);
      Sentry.captureException(captureError);
    });

    return { error: err.message };
  }
};
