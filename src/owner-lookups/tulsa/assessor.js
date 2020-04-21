const Sentry = require("@sentry/node");
const cheerio = require("cheerio");
const getAssessorValues = require("./getAddress.js");
const axios = require("axios");
const { default: formurlencoded } = require("form-urlencoded");
const parseOwnerInfo = require("./assessor-parser.js");

const ASSESSOR_URL = "/assessor-property-view.php";

const assessorAxios = axios.create({
  baseURL: "https://assessor.tulsacounty.org/",
  timeout: 9999,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:74.0) Gecko/20100101 Firefox/74.0",
  },
});

async function getOwnerData(address) {
  try {
    //  try to load form data first, otherwise we don't need to request
    const assessorFormData = formurlencoded(getAssessorValues(address));

    let res = await assessorAxios.get(ASSESSOR_URL);

    if (res.status >= 400) {
      throw Error(res.statusText);
    }

    const phpSessionCookies = res.headers["set-cookie"][0].split(" ")[0].trim();

    if (!phpSessionCookies) {
      throw Error("no cookies");
    }

    res = await assessorAxios({
      url: ASSESSOR_URL,
      headers: {
        cookie: phpSessionCookies,
      },
      method: "post",
      data: assessorFormData,
      withCredentials: true,
    });

    let $ = cheerio.load(res.data);

    //  check if there's duplicate entries
    const accounts = $("#pickone tr[goto]");

    if (accounts && accounts.length) {
      //  select first duplicate entry
      res = await assessorAxios.get(accounts.first().attr("goto"));
      $ = cheerio.load(res.data);
    }

    if (/No properties were found/.test(res.data)) {
      throw new Error("address not found in county assessor");
    }

    return parseOwnerInfo($);
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("assessor-raw-address", address);
      Sentry.captureException(err);
    });

    throw err;
  }
}

module.exports = getOwnerData;
