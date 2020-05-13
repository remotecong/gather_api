const { getThatsThemData } = require("./request.js");
const { getThatsThemUrl } = require("./url.js");
const { parseThatsThemData } = require("./parse.js");
const { cacheJSON, getCachedJSON } = require("../utils/cache.js");

async function getPhoneNumbers(address) {
  const cacheKey = "tt-" + address;
  const cachedNumbers = await getCachedJSON(cacheKey);

  if (cachedNumbers) {
    return cachedNumbers;
  }

  const url = getThatsThemUrl(address);
  const html = await getThatsThemData(url);

  if (!html.trim()) {
    throw new Error("thatsthem empty response");
  }

  const numbers = parseThatsThemData(html);
  cacheJSON(cacheKey, numbers);
  return numbers;
}

module.exports = {
  getPhoneNumbers,
  getThatsThemUrl
};
