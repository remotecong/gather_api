const Sentry = require("@sentry/node");
const { getPhoneNumbers, getThatsThemUrl } = require("./thatsthem");
const { getCachedJSON, cacheJSON } = require("./utils/cache.js");
const getOwnerData = require("./owner-lookups/tulsa/assessor");

module.exports = async (address) => {
  if (!address) {
    return { error: "Missing address" };
  }

  const cachedResults = await getCachedJSON(address);
  if (cachedResults) {
    return cachedResults;
  }

  try {
    const [ownerData, phoneData] = await Promise.all([
      getOwnerData(address),
      getPhoneNumbers(address),
    ]);

    const phones = phoneData.filter((p, i) => {
      // WARN: assumes assessor name will be uppercase
      const isOwner = p.name.toUpperCase().includes(ownerData.lastName);
      return ownerData.livesThere ? isOwner : !isOwner;
    });

    const results = {
      ...ownerData,
      phones,
      thatsThemUrl: getThatsThemUrl(address),
    };

    //  not caching if thatsthem fails to load
    if (phoneData && phoneData.length) {
      cacheJSON(address, results);
    }

    return results;
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("query", address);
      Sentry.captureException(err);
    });

    return { error: err.message };
  }
};
