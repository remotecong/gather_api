const puppeteer = require('puppeteer');
const Sentry = require('@sentry/node');
const { getThatsThemData, getThatsThemUrl } = require('./thatsthem.js');
const getAssessorValues = require('./getAddress.js');
const openPage = async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    return page;
};
const nameGuess = require('./name-guesser.js');
const UPS_BOXES = require('./ups-locations.js');

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
        Sentry.captureException(err);
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
        const homestead = document.querySelector('#adjustments tbody tr td:first-child').textContent === 'Homestead' &&
            document.querySelector('#adjustments tbody tr td:last-child img');
        const mailingAddress = Array.from(document.querySelectorAll('td')).find(cell => /Owner mailing address/i.test(cell.innerText)).nextElementSibling.innerHTML.replace(/<br>/g, ', ');
        const rawName = Array.from(document.querySelectorAll('td')).find(cell => /Owner name/i.test(cell.innerText)).nextElementSibling.textContent;
        return {mailingAddress, homestead, rawName};
    });

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

module.exports = async address => {
    if (!address) {
        return {error: 'Missing address'};
    }

    const assessorValues = getAssessorValues(address);
    if (!assessorValues || assessorValues.error) {
        return assessorValues;
    }

    const browser = await puppeteer.launch({
        timeout: 10000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    try {
        Sentry.addBreadcrumb({
            category: 'search',
            message: address,
            level: Sentry.Severity.Info
        });
        const [ownerData, phoneData] = await Promise.all([
            getOwnerData(browser, assessorValues),
            getThatsThemData(address)
        ]);
        browser.close();
        const phones = (phoneData || [])
            .filter((p, i) => {
                const isOwner = p.name.toUpperCase().includes(ownerData.lastName);
                return ownerData.livesThere ? isOwner : !isOwner;
            });
        return {...ownerData, phones, thatsThemUrl: getThatsThemUrl(address)};
    } catch (err) {
        Sentry.captureException(err);
        browser.close();
        return {error: err.message};
    }
};
