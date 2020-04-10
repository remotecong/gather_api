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

  $("#general tbody tr td").each((i, elem) => {
    const td = $(elem);
    const t = td.text();

    if (RE.MAILING_ADDR.test(t)) {
      //  reformat mailing address from html to preferred string
      mailingAddress = td.next().html().replace("<br>", ", ");
    } else if (RE.NAME.test(t)) {
      //  take owner name (LASTNAME, FIRST AND OTHER PEOPLE's NAMES)
      rawName = td.next().text().trim();
    } else if (RE.ADDR.test(t)) {
      //  just take house number form "Situs Address"
      houseNumber = td.next().text().split(" ")[0];
    }
    return !mailingAddress || !rawName || !houseNumber;
  });

  //  no sense continuing if we can't validate their name/address
  if (!mailingAddress || !rawName) {
    throw new Error(
      `Missing crititcal data: ADDR: ${mailingAddress} NAME: ${rawName}`
    );
  }

  //  is the site address present in mailing address?
  let livesThere = mailingAddress && mailingAddress.includes(houseNumber);

  //  if it's not, did they file homestead and do they use pobox?
  if (!livesThere) {
    $("#adjustments tbody tr td").each((i, elem) => {
      const td = $(elem);

      if (RE.HOMESTEAD.test(td.text())) {
        const homestead = td.parent().find("td").last().find("img").length > 0;
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
