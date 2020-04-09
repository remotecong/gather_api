const Sentry = require("@sentry/node");
const cheerio = require('cheerio');
const getAssessorValues = require("./getAddress.js");
const axios = require('axios');
const { default: formurlencoded } = require('form-urlencoded');
const parseOwnerInfo = require('./assessor-parser.js');

const ASSESSOR_URL = 'https://assessor.tulsacounty.org/assessor-property-view.php';

async function getOwnerData(address) {
  try {
    //  try to load form data first, otherwise we don't need to request
    const assessorFormData = formurlencoded(getAssessorValues(address));

    let res = await axios.get(ASSESSOR_URL);

    if (res.status >= 400) {
      throw Error(res.statusText);
    }

    const phpSessionCookies = res.headers['set-cookie'][0].split(' ')[0].trim();

    if (!phpSessionCookies) {
      throw Error('no cookies');
    }

    res = await axios({
      url: ASSESSOR_URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:74.0) Gecko/20100101 Firefox/74.0',
        'cookie': phpSessionCookies,
      },
      method: 'post',
      data: assessorFormData,
      withCredentials: true,
    });

    let $ = cheerio.load(res.data);

    //  check if there's duplicate entries
    const accounts = $('#pickone tr[goto]');

    if (accounts && accounts.length) {
      //  select first duplicate entry
      res = await axios.get(`https://assessor.tulsacounty.org/${accounts.first().attr('goto')}`);
      $ = cheerio.load(res.data);
    }

    return parseOwnerInfo($);
  } catch(err) {
    console.log('Assessor Fetch Fail:', err);
  }
}

module.exports = getOwnerData;


if (process.argv[1] === __filename) {
  getOwnerData('11221 S 106th E Ave, Bixby, OK')
    .then((data) => {
      console.log(data);
    });
}
