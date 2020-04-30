const { getThatsThemData } = require("./request.js");
const { getThatsThemUrl } = require("./url.js");
const { parseThatsThemData } = require("./parse.js");
const { cacheJSON, getCachedJSON } = require("../utils/cache.js");
const Sentry = require("@sentry/node");

const cacheKey = (addr) => 'tt-' + addr;

async function getPhoneNumbers(address) {
  try {
    const cachedNumbers = await getCachedJSON(cacheKey(address));

    if (cachedNumbers) {
      return cachedNumbers;
    }

    const url = getThatsThemUrl(address);
    const html = await getThatsThemData(url);

    if (!html.trim()) {
      throw new Error("thatsthem empty response");
    }

    const numbers = parseThatsThemData(html);
    cacheJSON(cacheKey(address), numbers);
    return numbers;
  } catch (thatsThemError) {
    const captureError = new Error(thatsThemError.message + ' ' + address);
    Sentry.captureException(captureError);
    return [];
  }
}

module.exports = {
  getPhoneNumbers,
  getThatsThemUrl,
};
