const puppeteer = require('puppeteer');
const waitUntil = 'domcontentloaded';
const ASSESSOR_URL = 'http://www.assessor.tulsacounty.org/assessor-property-search.php';
const AGREE_BUTTON_SELECTOR = '[name="accepted"].positive';
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

const getOwnerData = async (browser, values) => {
    const page = await browser.newPage();
    await page.goto(ASSESSOR_URL, {waitUntil});

    const shouldAccept = await page.$(AGREE_BUTTON_SELECTOR);
    if (shouldAccept) {
        await Promise.all([
            page.waitForNavigation(),
            page.click(AGREE_BUTTON_SELECTOR)
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

const getAssessorValues = address => {
    const assessorAddress = address.replace(/\./g, '').split(',').shift();
    const assessorPieces = assessorAddress.match(/(\d+) ([NSEW]) ([^ ]+) (.*) ([A-Za-z]+)$/) || assessorAddress.match(/(\d+) ([NSEW]) ([^ ]+) ([^\s]+)$/);

    if (!assessorPieces || assessorPieces.length < 5) {
        return {error: `Bad address\nGot ${address}\nDecoded as: ${JSON.stringify(assessorPieces)}`, input: address, decoded: assessorPieces};
    }

    const houseNumber = assessorPieces[1];
    const direction = assessorPieces[2];
    const streetName = assessorPieces[3];
    const streetTypeValue = assessorPieces.pop().toLowerCase();
    const streetType = (STREET_TYPES.find(t => t.options.includes(streetTypeValue) || t.options.some(o => o.includes(streetTypeValue))) || {value: 'ST'}).value;
    return {houseNumber, streetName, streetType, direction};
};

const getThatsThemData = async (browser, address) => {
    const thatsThemURL = `https://thatsthem.com/address/${address.replace(/\./g, '').replace(/,? /g, '-')}`;
    const page = await browser.newPage();
    await page.goto(thatsThemURL, {timeout: 60000, waitUntil});

    try {
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

    const browser = await puppeteer.launch();

    const [ownerData, phoneData] = await Promise.all([
        getOwnerData(browser, assessorValues),
        getThatsThemData(browser, address)
    ]);

    await browser.close();

    return {...ownerData, phones: phoneData.filter(p => (!ownerData.livesThere && !i) || p.name.toUpperCase().includes(ownerData.lastName))};
};
