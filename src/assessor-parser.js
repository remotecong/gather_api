const nameGuess = require("./name-guesser.js");
const usesPOBox = require("./ups-locations.js");

const RE = {
  MAILING_ADDR: /owner mailing address/i,
  NAME: /owner name/i,
  ADDR: /situs address/i,
  HOMESTEAD: /homestead/i,
};

function parseOwnerInfo($) {
  let mailingAddress;
  let rawName;
  let houseNumber;

  $('#general tbody tr td').each((i, elem) => {
    const td = $(elem);
    const t = td.text();

    if (RE.MAILING_ADDR.test(t)) {
      //  reformat mailing address from html to preferred string
      mailingAddress = td.next().html().replace('<br>', ', ');
    } else if (RE.NAME.test(t)) {
      //  take owner name (LASTNAME, FIRST AND OTHER PEOPLE's NAMES)
      rawName = td.next().text().trim();
    } else if (RE.ADDR.test(t)) {
      //  just take house number form "Situs Address"
      houseNumber = td.next().text().split(' ')[0];
    }
    return !mailingAddress || !rawName || !houseNumber;
  });


  //  is the site address present in mailing address?
  let livesThere = mailingAddress.includes(houseNumber);

  //  if it's not, did they file homestead and do they use pobox?
  if (!livesThere) {
    $('#adjustments tbody tr td')
      .each((i, elem) => {
        const td = $(elem);

        if (RE.HOMESTEAD.test(td.text())) {
          const homestead = td.parent().find('td').last().find('img').length > 0;
          livesThere = homestead && usesPOBox(mailingAddress);
          //  exit early
          return false;
        }
      });
  }

  return {
    mailingAddress,
    ownerName: rawName,
    lastName: nameGuess(rawName),
    livesThere,
  };
}

module.exports = parseOwnerInfo;

if (process.argv[1] === __filename) {
  const fs = require('fs');
  const cheerio = require('cheerio');

  fs.readFile('/Users/dillon/git/gather-py/assessor.html', (err, data) => {
    if (err) {
      console.error('FS READ ERR', err);
      return;
    }
    console.log(parseOwnerInfo(cheerio.load(data)));
  });
}
