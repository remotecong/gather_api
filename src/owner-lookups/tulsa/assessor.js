const Sentry = require("@sentry/node");
const cheerio = require("cheerio");
const getAssessorValues = require("./getAddress.js");
const axios = require("axios");
const { default: formurlencoded } = require("form-urlencoded");
const parseOwnerInfo = require("./assessor-parser.js");
const { cacheJSON, getCachedJSON } = require("../utils/cache.js");
const { USER_AGENT } = require("../utils/config.js");

const ASSESSOR_URL = "/assessor-property-view.php";

const assessorAxios = axios.create({
  baseURL: "https://assessor.tulsacounty.org/",
  timeout: 9999,
  headers: {
    "User-Agent": USER_AGENT
  }
});

async function getOwnerData(address) {
  try {
    const cacheKey = "tul-assessor" + address;
    const assessorCache = await getCachedJSON(cacheKey);

    if (assessorCache) {
      return assessorCache;
    }

    //  try to load form data first, otherwise we don't need to request
    const assessorFormData = formurlencoded(getAssessorValues(address));

    let res = await assessorAxios.get(ASSESSOR_URL);

    if (res.status >= 400) {
      throw new Error(res.statusText);
    }

    const phpSessionCookies = res.headers["set-cookie"][0].split(" ")[0].trim();

    if (!phpSessionCookies) {
      throw Error("no cookies");
    }

    res = await assessorAxios({
      url: ASSESSOR_URL,
      headers: {
        cookie: phpSessionCookies
      },
      method: "post",
      data: assessorFormData,
      withCredentials: true
    });

    let $ = cheerio.load(res.data);

    //  check if there's duplicate entries
    const accounts = $("#pickone tr[goto]");

    if (accounts && accounts.length) {
      //  select first duplicate entry
      res = await assessorAxios.get(accounts.first().attr("goto"));
      $ = cheerio.load(res.data);
    }

    //  message found on 2020-05-06 and was indicative that the property search simply
    //  serves the initial property search page upon submitting search form
    if (/We are currently experiencing intermittent issues with our web site/.test(res.data)) {
      throw new Error("assessor can't lookup properties right now");
    }

    if (/No properties were found/.test(res.data)) {
      throw new Error("address not found in county assessor");
    }

    const ownerInfo = parseOwnerInfo($);
    //  keeping the owner info cached in case thatsthem fails later
    cacheJSON(cacheKey, ownerInfo);
    return ownerInfo;
  } catch (err) {
    Sentry.withScope(scope => {
      const captureException = new Error(err.message + " " + address);
      scope.setTag("assessor-raw-address", address);
      Sentry.captureException(captureException);
    });

    throw err;
  }
}

module.exports = getOwnerData;
