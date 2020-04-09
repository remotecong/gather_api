const Sentry = require("@sentry/node");
const nameGuess = require("./name-guesser.js");
const usesPOBox = require("./ups-locations.js");
const fetch = require('@dillonchr/fetch');
const cheerio = require('cheerio');
const getAssessorValues = require("./getAddress.js");
const querystring = require('query-string');
const axios = require('axios');
const { default: formurlencoded } = require('form-urlencoded');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');

const ASSESSOR_URL = 'https://assessor.tulsacounty.org/assessor-property-view.php';

async function getOwnerData(browser, address, fn) {
  try {
    const firstLoadRes = await axios.get('https://assessor.tulsacounty.org/assessor-property-search.php')
    if (firstLoadRes.status >= 400) {
      throw Error(firstLoadRes.statusText);
    }
    const phpSessionCookies = firstLoadRes.headers['set-cookie'][0].substr(0, firstLoadRes.headers['set-cookie'][0].length - 6).trim();
    console.log('SESSION COOKIES', phpSessionCookies);
    if (!phpSessionCookies) {
      throw Error('no cookies');
    }
    console.log('SESSION COOKIES', phpSessionCookies);
    const assessorFormData = formurlencoded(getAssessorValues(address));
    console.log(assessorFormData);
    const scrape = await axios({
      url: ASSESSOR_URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:74.0) Gecko/20100101 Firefox/74.0',
        'cookie': phpSessionCookies,
      },
      method: 'post',
      data: assessorFormData,
      withCredentials: true,
    });
    console.log(scrape);

  } catch(err) {
    console.error('OH IT FAILED', err);
  }


  return console.log('THUS ENDS THE GREATEST COMMAND OF ALL TIME');


  /*

  const page = await openPage(
    browser,
    "http://www.assessor.tulsacounty.org/assessor-property-search.php"
  );

  const shouldAccept = await page.$('[name="accepted"].positive');
  if (shouldAccept) {
    await Promise.all([
      page.waitForNavigation(),
      page.click('[name="accepted"].positive')
    ]);
  }

  try {
    await Promise.all([
      page.waitForNavigation(),
      page.evaluate(data => {
        document.querySelector("#streetno").value = data.houseNumber;
        document.querySelector('[name="predirection"]').value = data.direction;
        document.querySelector("#streetname").value = data.streetName;
        document.querySelector("#streettype").value = data.streetType;
        document.querySelector("#bttnaddr").click();
      }, values)
    ]);
  } catch (err) {
    err.assessorSearch = true;
    Sentry.withScope(scope => {
      scope.setTag("assessor_dir", values.direction);
      scope.setTag("assessor_house_num", values.houseNumber);
      scope.setTag(
        "assessor_street",
        `${values.streetName} ${values.streetType}`
      );
      Sentry.captureException(err);
    });
    console.log("Failed to do the assessor search", err);
    return {};
  }

  const MULTI_RESULTS_ROW = "#pickone tbody tr:first-child";
  const multipleResultsTable = await page.$(MULTI_RESULTS_ROW);
  if (multipleResultsTable) {
    await Promise.all([
      page.waitForNavigation(),
      page.click(MULTI_RESULTS_ROW)
    ]);
  }

  const details = await page.evaluate(() => {
    try {
      const homestead =
        document.querySelector("#adjustments tbody tr td:first-child")
        .textContent === "Homestead" &&
        document.querySelector("#adjustments tbody tr td:last-child img");
      const mailingAddress = Array.from(document.querySelectorAll("td"))
        .find(cell => /Owner mailing address/i.test(cell.innerText))
        .nextElementSibling.innerHTML.replace(/<br>/g, ", ");
      const rawName = Array.from(document.querySelectorAll("td")).find(cell =>
        /Owner name/i.test(cell.innerText)
      ).nextElementSibling.textContent;
      return { mailingAddress, homestead, rawName };
    } catch (err) {
      //  pass up to node app
      return { error: err.stack };
    }
  });

  if (details.error) {
    Sentry.withScope(scope => {
      scope.setTag("assessor_dir", values.direction);
      scope.setTag("assessor_house_num", values.houseNumber);
      scope.setTag(
        "assessor_street",
        `${values.streetName} ${values.streetType}`
      );
      Sentry.captureException(new Error(details.error));
    });
//  TODO: come up with better handling for UI
    return null;
  }
  const { name, lastName } = nameGuess(details.rawName);
  const livesThere =
    details.mailingAddress.includes(values.houseNumber) ||
    (details.homestead && usesPOBox(details.mailingAddress));
  return { ...details, name, lastName, livesThere };
  */
}

module.exports = getOwnerData;


if (process.argv[1] === __filename) {
  getOwnerData(null, '11106 S 108th E Ave, Bixby, OK', (err, html) => {
    console.log('CALLBACK RUN', err || html);
  });
}
