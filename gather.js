const puppeteer = require('puppeteer');
/**
 * the available street type values for assessor searches,
 * some have been left out due to their absurdity (e.g. E, W)
 * @type {*[]}
 */
const STREET_TYPES = [
    {options: ["street"], value: "ST"},
    {options: ["avenue"], value: "AV"},
    {options: ["place"], value: "PL"},
    {options: ["road", "rd"], value: "RD"},
    {options: ["court", "ct"], value: "CT"},
    {options: ["circle"], value: "CR"},
    {options: ["drive"], value: "DR"},
    {options: ["lane", "ln"], value: "LN"},
    {options: ["park", "pr", "pk"], value: "PK"},
    {options: ["boulevard", "blvd"], value: "BV"},
    {options: ["expressway", "expwy"], value: "EX"},
    {options: ["highway", "hwy"], value: "HY"},
    {options: ["terrace", "tr"], value: "TE"},
    {options: ["trail", "tl"], value: "TL"},
    {options: ["way", "wy"], value: "WY"}
];

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

    return await page.evaluate(houseNumber => {
        const mailingAddress = Array.from(document.querySelectorAll('td')).find(cell => /Owner mailing address/i.test(cell.innerText)).nextElementSibling.innerHTML.replace(/<br>/g, ', ');
        const name = Array.from(document.querySelectorAll('td')).find(cell => /Owner name/i.test(cell.innerText)).nextElementSibling.textContent;
        const lastName = name.split(',').map(s => s.trim()).shift();
        const livesThere = mailingAddress.includes(houseNumber);
        return {mailingAddress, name, lastName, livesThere};
    }, values.houseNumber);
};

/**
 * returns assessor required values for running property search
 * @param address
 * @returns {*}
 */
const getAssessorValues = address => {
    //  1234 N Main St, City Name, ST
    const assessorAddress = address
        //  ditch everything after the first comma
        .split(',')
        //  just give me the street address, we know it's in tulsa
        .shift()
        //  strip away all periods (e.g. "S.")
        .replace(/\./g, '')
        //  reduce any directional words to be their single character to help me match later
        .replace(/\sEast\s/ig, ' E ')
        .replace(/\sNorth\s/ig, ' N ')
        .replace(/\sSouth\s/ig, ' S ')
        .replace(/\sWest\s/ig, 'W');
    //  grab house number, direction, street name, sub-direction (to ignore) and street type
    const assessorPieces = assessorAddress.match(/(\d+) ([NSEW]) ([^ ]+) ([NSEW]\s)?([A-Za-z]+)( [NSEW])?$/i);

    //  it either works perfectly or not at all
    if (!assessorPieces || assessorPieces.length < 6) {
        return {error: `Bad address\nGot ${assessorAddress}\nDecoded as: ${JSON.stringify(assessorPieces)}`, input: address, decoded: assessorPieces};
    }

    //  clean up pieces with names
    const houseNumber = assessorPieces[1];
    const direction = assessorPieces[2];
    const streetName = assessorPieces[3];
    //  data massage the street type to match available types in Assessor search
    const streetTypeValue = assessorPieces[5].toLowerCase();
    const streetType = (STREET_TYPES.find(t => t.options.includes(streetTypeValue) || t.options.some(o => o.includes(streetTypeValue))) || {value: 'ST'}).value;
    return {houseNumber, streetName, streetType, direction};
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
