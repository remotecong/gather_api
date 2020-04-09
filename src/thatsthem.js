const Sentry = require("@sentry/node");
const cheerio = require('cheerio');
const axios = require('axios');

const getThatsThemUrl = address =>
  `https://thatsthem.com/address/${address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/,? /g, "-")}`;

async function getThatsThemData(address) {
  try {
    const url = getThatsThemUrl(address);
    Sentry.configureScope(scope => {
      scope.setTag("tt_url", url);
    });

    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:74.0) Gecko/20100101 Firefox/74.0',
      },
    });

    return parseThatsThemData(res.data);
  } catch (err) {
    throw new Error(err.message);
  }
}

function parseThatsThemData(html) {
  const $ = cheerio.load(html);

  //  iterate over each record a for a resident
  return $('.ThatsThem-people-record.row')
    .map((i, elem) => {
      const row = $(elem);
      const name = row.find('h2').text().trim();

      //  iterate over each phone number for a given resident
      return row.find('span[itemprop="telephone"]')
        .map((i, a) => {
          const link = $(a);
          return {
            name,
            number: link.text().trim(),
            isMobile: link.attr('data-title') === 'Mobile',
          };
        }).get();
    })
    //  flatten elements to array
    .get()
    //  flatten array
    .reduce((arr, cur) => arr.concat(cur), [])
    //  remove duplicated numbers
    .filter((p, i, a) => {
      return (
        p.number && a.findIndex(({ number }) => number === p.number) === i
      );
    });
}

module.exports = {
  getThatsThemData,
  getThatsThemUrl
};

if (process.argv[1] === __filename) {
  getThatsThemData('11106 S 108th E Ave, Bixby, OK')
    .then((data) => console.log(data))
    .catch((err) => console.error(err));
}
