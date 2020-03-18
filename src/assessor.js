const Sentry = require("@sentry/node");
const nameGuess = require("./name-guesser.js");
const usesPOBox = require("./ups-locations.js");

async function openPage(browser, url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

async function getOwnerData(browser, values) {
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
}

module.exports = getOwnerData;
