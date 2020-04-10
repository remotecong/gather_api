const Sentry = require("@sentry/node");
const cheerio = require("cheerio");
const axios = require("axios");
const debugTimer = require("./utils/debugTimer");

const getThatsThemUrl = (address) =>
  `https://thatsthem.com/address/${address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/,? /g, "-")}`;

async function getThatsThemData(address) {
  try {
    const end = debugTimer("THATSTHEM FETCH");
    const url = getThatsThemUrl(address);
    Sentry.configureScope((scope) => {
      scope.setTag("tt_url", url);
    });

    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:74.0) Gecko/20100101 Firefox/74.0",
      },
    });

    end();
    return parseThatsThemData(res.data);
  } catch (err) {
    throw new Error(err.message);
  }
}

function parseThatsThemData(html) {
  const end = debugTimer("THATSTHEM PARSE");
  const $ = cheerio.load(html);

  //  iterate over each record a for a resident
  const results = $(".ThatsThem-people-record.row")
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

  end($("title").text());
  return results;
}

module.exports = {
  getThatsThemData,
  getThatsThemUrl,
  parseThatsThemData,
};
