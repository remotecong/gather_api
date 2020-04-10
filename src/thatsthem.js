const Sentry = require("@sentry/node");
const cheerio = require("cheerio");
const axios = require("axios");
const { getCachedJSON, cacheJSON } = require("./utils/cache.js");

const getThatsThemUrl = (address) =>
  `https://thatsthem.com/address/${address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/,? /g, "-")}`;

async function getThatsThemData(address) {
  try {
    const url = getThatsThemUrl(address);
    const cachedNumbers = await getCachedJSON(url);

    if (cachedNumbers) {
      return cachedNumbers;
    }

    Sentry.configureScope((scope) => {
      scope.setTag("tt_url", url);
    });

    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:74.0) Gecko/20100101 Firefox/74.0",
      },
    });

    const numbers = parseThatsThemData(res.data);
    cacheJSON(url, numbers);
    return numbers;
  } catch (err) {
    throw new Error(err.message);
  }
}

function parseThatsThemData(html) {
  const $ = cheerio.load(html);

  //  iterate over each record a for a resident
  return $(".ThatsThem-people-record.row")
    .toArray()
    .reduce((coll, elem) => {
      const row = $(elem);
      const name = row.find("h2").text().trim();

      //  iterate over each phone number for a given resident
      row.find('span[itemprop="telephone"]').each((i, span) => {
        const link = $(span).parent();
        const number = link.text().trim();

        if (!coll.some((p) => p.number === number)) {
          coll.push({
            name,
            number,
            isMobile: link.attr("data-title") === "Mobile",
          });
        }
      });
      return coll;
    }, []);
}

module.exports = {
  getThatsThemData,
  getThatsThemUrl,
  parseThatsThemData,
};
