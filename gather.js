const puppeteer = require('puppeteer');
const getAssessorValues = require('./getAddress');
const openPage = async (browser, url) => {
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    return page;
};

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

    return await page.evaluate(houseNumber => {
        const mailingAddress = Array.from(document.querySelectorAll('td')).find(cell => /Owner mailing address/i.test(cell.innerText)).nextElementSibling.innerHTML.replace(/<br>/g, ', ');
        const rawName = Array.from(document.querySelectorAll('td')).find(cell => /Owner name/i.test(cell.innerText)).nextElementSibling.textContent;
        const name = rawName
            .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
            .replace(/\sAnd\s/g, ' & ')
            .replace(/\s[A-Z]\s/g, ' ')
            .split(', ')
            .reverse()
            .join(' ');
        const lastName = rawName.split(',').map(s => s.trim()).shift();
        const livesThere = mailingAddress.includes(houseNumber);
        return {mailingAddress, name, lastName, livesThere};
    }, values.houseNumber);
};

/**
 * looks up phone numbers using ThatsThem
 * @param browser
 * @param address
 * @returns {Promise<*>}
 */
const getThatsThemData = async (browser, address) => {
    try {
        const page = await openPage(browser, `https://thatsthem.com/address/${address.replace(/\./g, '').replace(/,? /g, '-')}`);
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.ThatsThem-people-record.row'))
                .map(result => {
                    const name = result.querySelector('h2').textContent.trim();
                    const number = (result.querySelector('[itemprop="telephone"]') || document.createElement('span')).textContent.trim();
                    const isMobile = !!result.querySelector('[data-title="Mobile"] [itemprop="telephone"]');
                    return {name, number, isMobile};
                })
                .filter((p, i, a) => !!p.number && a.findIndex(ap => ap.number === p.number) === i);
        });
    } catch (err) {
        console.log('thatsthem error:', err);
    }
};

module.exports = async address => {
    if (!address) {
        return {error: 'Missing address'};
    }

    const assessorValues = getAssessorValues(address);
    if (!assessorValues || assessorValues.error) {
        return assessorValues;
    }

    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']});

    try {
        const [ownerData, phoneData] = await Promise.all([
            getOwnerData(browser, assessorValues),
            getThatsThemData(browser, address)
        ]);
        browser.close();
        return {...ownerData, phones: phoneData.filter((p, i) => (!ownerData.livesThere && !i) || p.name.toUpperCase().includes(ownerData.lastName))};
    } catch (err) {
        browser.close();
        return {error: err.message};
    }
};
