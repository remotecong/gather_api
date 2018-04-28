const puppeteer = require('puppeteer');
const AGREE_BUTTON_SELECTOR = '[name="accepted"].positive';
const STREET_TYPES = 'Avenue:AV;Boulevard:BV;Circle:CR;Court:CT;Drive:DR;East:E;Expressway:EX;Highway:HY;Lane:LN;North:N;Park:PK;Place:PL;Road:RD;South:S;Street:ST;Terrace:TE;Trail:TL;Way:WY;West:W'.split(';').map(s => {
    const [name, value] = s.split(':');
    return {name: name.toLocaleLowerCase(), value};
});
const address = process.argv[2];

if (!address) {
    console.log('Missing address!');
    process.exit(1);
}

const assessorPieces = address.split(',').shift().match(/(\d+) ([NSEW]) ([^ ]+) (.*) ([A-Za-z]+)$/);

if (!assessorPieces && assessorPieces.length < 6) {
    console.log('bad address I guess', assessorPieces);
    console.log('from', address);
}

const houseNumber = assessorPieces[1];
const direction = assessorPieces[2];
const streetName = assessorPieces[3];
const streetType = STREET_TYPES.find(t => t.name.includes(assessorPieces[5].toLowerCase())).value;

console.log({number: houseNumber, direction, streetName, streetType});

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://www.assessor.tulsacounty.org/assessor-property-search.php');

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
            }, {houseNumber, streetName, streetType, direction})
        ]);
    } catch (err) {
        console.log('Failed to do the search :(');
        console.log(err);
    }

    const ownerData = await page.evaluate(() => {
        const mailingAddress = Array.from(document.querySelectorAll('td')).find(cell => /Owner mailing address/i.test(cell.innerText)).nextElementSibling.innerHTML.replace(/<br>/g, ', ');
        const name = Array.from(document.querySelectorAll('td')).find(cell => /Owner name/i.test(cell.innerText)).nextElementSibling.textContent;
        const lastName = name.split(',').map(s => s.trim()).shift();
        return {mailingAddress, name, lastName};
    });

    console.log(ownerData);

    const thatsThemURL = `https://thatsthem.com/address/${address.replace(/,? /g, '-')}`;
    await page.goto(thatsThemURL, {timeout: 60000});

    try {
        const phoneData = await page.evaluate(lastName => {
            return Array.from(document.querySelectorAll('.ThatsThem-people-record.row')).map(result => {
                const name = result.querySelector('h2').textContent.trim();
                const houseNumber = (result.querySelector('[itemprop="telephone"]') || document.createElement('span')).textContent.trim();
                return {name, houseNumber};
            }).find(p => p.name.toUpperCase().includes(lastName));
        }, ownerData.lastName);
        console.log('Phone data', phoneData);
    } catch (err) {
        console.log('no thatsthem found :(');
        console.log(err);
    }


    await page.screenshot({path: 'example.png'});
    await browser.close();
})();
