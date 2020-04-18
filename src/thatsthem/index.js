const { getThatsThemData } = require("./request.js");
const { getThatsThemUrl } = require("./url.js");
const { parseThatsThemData } = require("./parse.js");
const { cacheJSON } = require("../utils/cache.js");

async function getPhoneNumbers(address) {
  const url = getThatsThemUrl(address);
  const html = await getThatsThemData(url);
  const numbers = parseThatsThemData(html);
  cacheJSON(url, numbers);
  return numbers;
}

module.exports = {
  getPhoneNumbers,
  getThatsThemUrl,
};
