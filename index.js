const puppeteer = require('puppeteer');
const AGREE_BUTTON_SELECTOR = '[name="accepted"].positive';

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


    //  ((address) => {
    //     const [wholeMatch, number, direction, streetName, ignore, streetType] = address.split(',').shift().match(/(\d+) ([NSEW]) ([^ ]+) (.*) ([A-Za-z]+)$/);
    //     document.querySelector('#streetno').value = number;
    //     document.querySelector('[name="predirection"]').value = direction;
    //     document.querySelector('#streetname').value = streetName;
    //     document.querySelector('#streettype').value = streetType;
    //     document.querySelector('#bttnaddr').click();
    // })('11106 S 108th E Ave');

    // (() => {
    //     const address = Array.from(document.querySelectorAll('td')).find(cell => /Owner mailing address/i.test(cell.innerText)).nextElementSibling.innerHTML.replace(/<br>/g, ', ');
    //     const ownerName = Array.from(document.querySelectorAll('td')).find(cell => /Owner name/i.test(cell.innerText)).nextElementSibling.textContent;
    //     return {address, ownerName};
    // })();

    //	GOTO THATSTHEM

    // ((assessorName) => {
    //     const lastName = assessorName.split(',').map(s => s.trim()).shift();
    //     return Array.from(document.querySelectorAll('.ThatsThem-people-record.row')).map(result => {
    //         const name = result.querySelector('h2').textContent.trim();
    //         const number = (result.querySelector('[itemprop="telephone"]') || document.createElement('span')).textContent.trim();

    //         return {name, number};
    //     }).find(p => p.name.toUpperCase().includes(lastName));
    // })('CHRISTENSEN, JUSTIN D');


    await page.screenshot({path: 'example.png'});
    await browser.close();
})();
