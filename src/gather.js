const Sentry = require("@sentry/node");
const { getPhoneNumbers, getThatsThemUrl } = require("./thatsthem");
const { getCachedJSON, cacheJSON } = require("./utils/cache.js");
const getOwnerData = require("./owner-lookups/tulsa/assessor");
const infoFilter = require("./utils/infoFilter.js");

module.exports = async (address) => {
  if (!address) {
    return { error: "Missing address" };
  }

  const cachedResults = await getCachedJSON(address);
  if (cachedResults) {
    return cachedResults;
  }

  try {
    const [ownerData, thatsThemData] = await Promise.all([
      getOwnerData(address),
      getPhoneNumbers(address),
    ]);

    const results = {
      thatsThemUrl: getThatsThemUrl(address),
      ...infoFilter(ownerData, thatsThemData),
    };

    //  not caching if thatsthem fails to load
    if (thatsThemData.length) {
      cacheJSON(address, results);
    }

    return results;
  } catch (err) {
    const captureError = new Error(err.message + ' ' + address);
    Sentry.withScope((scope) => {
      scope.setTag("query", address);
      Sentry.captureException(captureError);
    });

    return { error: err.message };
  }
};
