const puppeteer = require("puppeteer");
const Sentry = require("@sentry/node");
const { getThatsThemData, getThatsThemUrl } = require("./thatsthem.js");
const getAssessorValues = require("./getAddress.js");
const { getCachedSearch, cacheSearch } = require("./cache.js");
const MAX_REQ_TIMEOUT = 10000;
const getOwnerData = require("./assessor");

const BROWSER_STATE = {
  browser: null,
  timerId: -1
};

const getBrowser = async () => {
  clearTimeout(BROWSER_STATE.timerId);
  BROWSER_STATE.timerId = setTimeout(closeBrowser, MAX_REQ_TIMEOUT * 3);
  if (BROWSER_STATE.browser) {
    return BROWSER_STATE.browser;
  }
  BROWSER_STATE.browser = await puppeteer.launch({
    timeout: MAX_REQ_TIMEOUT,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });
  return BROWSER_STATE.browser;
};

const closeBrowser = async () => {
  try {
    const browser = BROWSER_STATE.browser;
    BROWSER_STATE.browser = null;
    return await browser.close();
  } catch (err) {
    Sentry.captureException(err);
  }
};

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
    return assessorValues;
  }

  try {
    const browser = await getBrowser();
    const [ownerData, phoneData] = await Promise.all([
      getOwnerData(browser, address),
      getThatsThemData(address)
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
