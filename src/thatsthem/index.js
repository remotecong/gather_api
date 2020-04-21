const { getThatsThemData } = require("./request.js");
const { getThatsThemUrl } = require("./url.js");
const { parseThatsThemData } = require("./parse.js");
const { cacheJSON } = require("../utils/cache.js");
const Sentry = require("@sentry/node");

async function getPhoneNumbers(address) {
  try {
    const url = getThatsThemUrl(address);
    const html = await getThatsThemData(url);
    const numbers = parseThatsThemData(html);
    cacheJSON(url, numbers);
    return numbers;
  } catch (thatsThemError) {
    Sentry.captureException(thatsThemError);
    return [];
  }
}

module.exports = {
  getPhoneNumbers,
  getThatsThemUrl,
};
