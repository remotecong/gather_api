import puppeteer, { Browser, JSONObject } from "puppeteer";
import Sentry from "@sentry/node";
import { getThatsThemData, getThatsThemUrl } from "./thatsthem";
import { getAssessorValues, AssessorValues } from "./getAddress";
import * as cache from "./cache";
import { guessName } from "./name-guesser";
import UPS_BOXES from "./ups-locations";
const MAX_REQ_TIMEOUT = 10000;

async function openPage(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

interface OwnerData {
  mailingAddress: string;
  homestead: boolean;
  rawName: string;
  name: string;
  lastName: string | undefined;
  livesThere: boolean;
}

async function getOwnerData(
  browser: Browser,
  values: AssessorValues
): Promise<never | OwnerData> {
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

  Sentry.withScope(scope => {
    scope.setTag("assessor_dir", values.direction);
    scope.setTag("assessor_house_num", values.houseNumber);
    scope.setTag(
      "assessor_street",
      `${values.streetName} ${values.streetType}`
    );
  });

  await Promise.all([
    page.waitForNavigation(),
    page.evaluate((data: AssessorValues) => {
      (<HTMLInputElement>document.querySelector("#streetno")).value =
        data.houseNumber;
      (<HTMLInputElement>(
        document.querySelector('[name="predirection"]')
      )).value = data.direction;
      (<HTMLInputElement>document.querySelector("#streetname")).value =
        data.streetName;
      (<HTMLInputElement>document.querySelector("#streettype")).value =
        data.streetType;
      (<HTMLButtonElement>document.querySelector("#bttnaddr")).click();
    }, values)
  ]);

  const MULTI_RESULTS_ROW = "#pickone tbody tr:first-child";
  const multipleResultsTable = await page.$(MULTI_RESULTS_ROW);
  if (multipleResultsTable) {
    await Promise.all([
      page.waitForNavigation(),
      page.click(MULTI_RESULTS_ROW)
    ]);
  }

  const details:
    | {
        mailingAddress: string;
        homestead: boolean;
        rawName: string;
      }
    | undefined = await page.evaluate(() => {
    const allTableCells = Array.from(document.querySelectorAll("td"));

    if (!allTableCells.length) {
      return;
    }

    const homesteadTableCell = document.querySelector(
      "#adjustments tbody tr td:first-child"
    );
    if (!homesteadTableCell) {
      return;
    }

    const homestead =
      homesteadTableCell.textContent === "Homestead" &&
      !!document.querySelector("#adjustments tbody tr td:last-child img");

    const ownerMailingAddressCell = allTableCells.find(cell =>
      /Owner mailing address/i.test(cell.innerText)
    );

    const ownerNameCell = allTableCells.find(cell =>
      /Owner name/i.test(cell.innerText)
    );

    if (!ownerMailingAddressCell || !ownerNameCell) {
      return;
    }

    const mailingAddress =
      ownerMailingAddressCell &&
      (<HTMLElement>(
        ownerMailingAddressCell.nextElementSibling
      )).innerHTML.replace(/<br>/g, ", ");

    const rawName: string =
      (ownerNameCell &&
        (<HTMLElement>ownerNameCell.nextElementSibling).textContent) ||
      "";

    return { mailingAddress, homestead, rawName };
  });

  if (!details) {
    Sentry.withScope(scope => {
      scope.setTag("assessor_dir", values.direction);
      scope.setTag("assessor_house_num", values.houseNumber);
      scope.setTag(
        "assessor_street",
        `${values.streetName} ${values.streetType}`
      );
      Sentry.captureException(
        new Error("no details found on loaded assessor page")
      );
    });
    throw new Error("no details found on loaded assessor page");
  }

  const { name, lastName } = guessName(details.rawName);
  const livesThere =
    details.mailingAddress.includes(values.houseNumber) ||
    (details.homestead && usesPOBox(details.mailingAddress));
  return { ...details, name, lastName, livesThere };
}

function usesPOBox(addr: string) {
  const comp = addr.toLowerCase();
  return (
    /po box/.test(comp) ||
    UPS_BOXES.some((box: string) => {
      return comp.includes(box.toLowerCase());
    })
  );
}

let browserTimerId: NodeJS.Timeout;
let sharableBrowser: Browser | undefined;

async function getBrowser() {
  clearTimeout(browserTimerId);
  browserTimerId = setTimeout(closeBrowser, MAX_REQ_TIMEOUT * 3);
  if (sharableBrowser) {
    return sharableBrowser;
  }
  sharableBrowser = await puppeteer.launch({
    timeout: MAX_REQ_TIMEOUT,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });
  return sharableBrowser;
}

async function closeBrowser() {
  try {
    const browser = sharableBrowser;
    sharableBrowser = undefined;

    if (browser) {
      return await browser.close();
    }
  } catch (err) {
    Sentry.captureException(err);
  }
}

async function getCachedSearch(address: string) {
  try {
    const data = await cache.getVal(address);
    return JSON.parse(data);
  } catch (err) {
    Sentry.captureException(err);
    return null;
  }
}

async function cacheSearch(address: string, results: object) {
  try {
    return cache.setVal(address, JSON.stringify(results));
  } catch (err) {
    Sentry.captureException(err);
  }
}

async function GatherLookup(address?: string) {
  if (!address) {
    return { error: "Missing address" };
  }

  const cachedResults = await getCachedSearch(address);
  if (cachedResults) {
    return cachedResults;
  }

  try {
    const assessorValues = getAssessorValues(address);
    const browser = await getBrowser();
    const [ownerData, phoneData] = await Promise.all([
      getOwnerData(browser, assessorValues),
      getThatsThemData(address)
    ]);
    const phones = phoneData.filter((p, i) => {
      // WARN: assumes assessor name will be uppercase
      const isOwner = p.name.toUpperCase().includes(ownerData.lastName || '');
      return ownerData.livesThere ? isOwner : !isOwner;
    });
    const results = {
      ...ownerData,
      phones,
      thatsThemUrl: getThatsThemUrl(address)
    };
    //  not caching if thatsthem fails to load
    if (phoneData && phoneData.length) {
      cacheSearch(address, results);
    }
    return results;
  } catch (err) {
    Sentry.withScope(scope => {
      scope.setTag("query", address);
      Sentry.captureException(err);
    });

    return { error: err.message };
  }
}

export default GatherLookup;
