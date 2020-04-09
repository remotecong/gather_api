const Sentry = require("@sentry/node");
const { getThatsThemData, getThatsThemUrl } = require("./thatsthem.js");
const getAssessorValues = require("./getAddress.js");
const { getCachedSearch, cacheSearch } = require("./cache.js");
const MAX_REQ_TIMEOUT = 10000;
const getOwnerData = require("./assessor");

module.exports = async address => {
  if (!address) {
    return { error: "Missing address" };
  }

  const cachedResults = await getCachedSearch(address);
  if (cachedResults) {
    return cachedResults;
  }

  const assessorValues = getAssessorValues(address);
  if (!assessorValues || assessorValues.error) {
    return assessorValues || {error: "Couldn't parse address for assessor"};
  }

  try {
    const [ownerData, phoneData] = await Promise.all([
      getOwnerData(address),
      getThatsThemData(address),
    ]);

    const phones = phoneData.filter((p, i) => {
      // WARN: assumes assessor name will be uppercase
      const isOwner = p.name.toUpperCase().includes(ownerData.lastName);
      return ownerData.livesThere ? isOwner : !isOwner;
    });

    const results = {
      ...ownerData,
      phones,
      thatsThemUrl: getThatsThemUrl(address)
    };
    //  not caching if thatsthem fails to load
    if (phoneData && phoneData.length) {
      cacheSearch(address, results);
    }
    return results;
  } catch (err) {
    Sentry.withScope(scope => {
      scope.setTag("query", address);
      Sentry.captureException(err);
    });

    return { error: err.message };
  }
};
