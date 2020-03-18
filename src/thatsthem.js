const Sentry = require("@sentry/node");
const { promisify } = require("bluebird");
const domget = promisify(require("@dillonchr/domget"));

const getThatsThemUrl = address =>
  `https://thatsthem.com/address/${address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/,? /g, "-")}`;

/**
 * looks up phone numbers using ThatsThem
 * @param browser
 * @param address
 * @returns {Promise<*>}
 */
const getThatsThemData = async address => {
  try {
    const url = getThatsThemUrl(address);
    Sentry.configureScope(scope => {
      scope.setTag("tt_url", url);
    });

    const document = await domget({
      url,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:72.0) Gecko/20100101 Firefox/72.0"
      }
    });

    return Array.from(document.querySelectorAll(".ThatsThem-people-record.row"))
      .map(elem => {
        const name = elem.querySelector("h2").text.trim();
        const fake = true;

        return Array.from(elem.querySelectorAll("a"))
          .filter(a => /^\/phone/.test(a.attributes.href))
          .map(a => {
            return {
              name,
              number: a.text.trim(),
              isMobile: a.attributes["data-title"] === "Mobile"
            };
          });
      })
      .reduce((arr, cur) => arr.concat(cur), [])
      .filter((p, i, a) => {
        return (
          p.number && a.findIndex(({ number }) => number === p.number) === i
        );
      });
  } catch (err) {
    err.thatsThem = true;
    Sentry.captureException(err);
    console.log("thatsthem error:", err);
  }

  //  in the event of catastrophic failure, have an array.
  return [];
};

module.exports = {
  getThatsThemData,
  getThatsThemUrl
};
