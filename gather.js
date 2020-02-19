const puppeteer = require('puppeteer');
const Sentry = require('@sentry/node');
const { getThatsThemData, getThatsThemUrl } = require('./thatsthem.js');
const getAssessorValues = require('./getAddress.js');
const cache = require('./cache.js');
const openPage = async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    return page;
};
const nameGuess = require('./name-guesser.js');
const UPS_BOXES = require('./ups-locations.js');
const MAX_REQ_TIMEOUT = 10000;

/**
 * runs assessor search for decoded address and returns owner's info which includes:
 * name - string
 * lastName - string
 * livesThere - bool
 * @param browser - puppeteer
 * @param values - search values from getAssessorValues
 * @returns {Promise<*>}
 */
const getOwnerData = async (browser, values) => {
    const page = await openPage(browser, 'http://www.assessor.tulsacounty.org/assessor-property-search.php');

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
                document.querySelector('#streetno').value = data.houseNumber;
                document.querySelector('[name="predirection"]').value = data.direction;
                document.querySelector('#streetname').value = data.streetName;
                document.querySelector('#streettype').value = data.streetType;
                document.querySelector('#bttnaddr').click();
            }, values)
        ]);
    } catch (err) {
        err.assessorSearch = true;
        Sentry.withScope(scope => {
            scope.setTag('assessor_dir', values.direction);
            scope.setTag('assessor_house_num', values.houseNumber);
            scope.setTag('assessor_street', `${values.streetName} ${values.streetType}`);
            Sentry.captureException(err);
        });
        console.log('Failed to do the assessor search', err);
        return {};
    }

    const MULTI_RESULTS_ROW = '#pickone tbody tr:first-child';
    const multipleResultsTable = await page.$(MULTI_RESULTS_ROW);
    if (multipleResultsTable) {
        await Promise.all([
            page.waitForNavigation(),
            page.click(MULTI_RESULTS_ROW)
        ]);
    }

    const details = await page.evaluate(() => {
        try {
            const homestead = document.querySelector('#adjustments tbody tr td:first-child').textContent === 'Homestead' &&
                document.querySelector('#adjustments tbody tr td:last-child img');
            const mailingAddress = Array.from(document.querySelectorAll('td')).find(cell => /Owner mailing address/i.test(cell.innerText)).nextElementSibling.innerHTML.replace(/<br>/g, ', ');
            const rawName = Array.from(document.querySelectorAll('td')).find(cell => /Owner name/i.test(cell.innerText)).nextElementSibling.textContent;
            return {mailingAddress, homestead, rawName};
        } catch (err) {
            //  pass up to node app
            return {error: err};
        }
    });

    if (details.error) {
        Sentry.withScope(scope => {
            scope.setTag('assessor_dir', values.direction);
            scope.setTag('assessor_house_num', values.houseNumber);
            scope.setTag('assessor_street', `${values.streetName} ${values.streetType}`);
            Sentry.captureException(details.error);
        });
        //  TODO: come up with better handling for UI
        return null;
    }
    const {name, lastName} = nameGuess(details.rawName);
    const livesThere = details.mailingAddress.includes(values.houseNumber) ||
        (details.homestead && usesPOBox(details.mailingAddress));
    return {...details, name, lastName, livesThere};
};

const usesPOBox = (addr) => {
    const comp = addr.toLowerCase();
    return /po box/.test(comp) || UPS_BOXES.some((box) => {
        return comp.includes(box.toLowerCase());
    });
};

const BROWSER_STATE = {
    browser: null,
    timerId: -1
};

const getBrowser = async () => {
    clearTimeout(BROWSER_STATE.timerId);
    BROWSER_STATE.timerId = setTimeout(closeBrowser, MAX_REQ_TIMEOUT * 3);
    if (BROWSER_STATE.browser) {
        return BROWSER_STATE.browser
    }
    BROWSER_STATE.browser = await puppeteer.launch({
        timeout: MAX_REQ_TIMEOUT,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    return BROWSER_STATE.browser
};

const closeBrowser = async () => {
    try {
        const browser = BROWSER_STATE.browser;
        BROWSER_STATE.browser = null;
        return await browser.close();
    } catch (err) {
        Sentry.captureException(err);
    }
};

const getCachedSearch = async (address) => {
    try {
        const data = await cache.getVal(address);
        return JSON.parse(data);
    } catch(err) {
        Sentry.captureException(err);
        return null;
    }
};

const cacheSearch = async (address, results) => {
    try {
        return cache.setVal(address, JSON.stringify(results));
    } catch(err) {
        Sentry.captureException(err);
    }
};

module.exports = async address => {
    if (!address) {
        return {error: 'Missing address'};
    }

    const cachedResults = await getCachedSearch(address);
    if (cachedResults) {
        return cachedResults;
    }

    const assessorValues = getAssessorValues(address);
    if (!assessorValues || assessorValues.error) {
        return assessorValues;
    }

    const { houseNumber, direction, streetName, streetType } = assessorValues;

    try {
        const browser = await getBrowser();
        const [ownerData, phoneData] = await Promise.all([
            getOwnerData(browser, assessorValues),
            getThatsThemData(address)
        ]);
        const phones = (phoneData || [])
            .filter((p, i) => {
                const isOwner = p.name.toUpperCase().includes(ownerData.lastName);
                return ownerData.livesThere ? isOwner : !isOwner;
            });
        const results = {...ownerData, phones, thatsThemUrl: getThatsThemUrl(address)};
        //  not caching if thatsthem fails to load
        if (phoneData && phoneData.length) {
            cacheSearch(address, results);
        }
        return results;
    } catch (err) {
        Sentry.withScope(scope => {
            scope.setTag('query', address);
            Sentry.captureException(err);
        });

        return {error: err.message};
    }
};
