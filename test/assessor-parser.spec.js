const parseOwnerInfo = require("../src/owner-lookups/tulsa/assessor-parser");
const cheerio = require("cheerio");
const fs = require("fs");

function getMock(name, fn) {
  fs.readFile(`test/mocks/${name}`, (err, data) => {
    expect(err).not.toBeTruthy();
    fn(cheerio.load(data));
  });
}

test("lives there, mailing address matches", () => {
  getMock("assessor-livesthere.html", ($) => {
    const { lastName, livesThere, mailingAddress, ownerName } = parseOwnerInfo(
      $
    );
    expect(lastName).toBe("CHRISTENSEN");
    expect(livesThere).toBeTruthy();
    expect(mailingAddress).toBe("11106 S 108TH EAST AVE, BIXBY, OK 74008");
    expect(ownerName).toBe("CHRISTENSEN, JUSTIN D");
  });
});

test("lives there, mailing address mismatch, homestead & pobox", () => {
  getMock("assessor-livesthere-homestead.html", ($) => {
    const { livesThere } = parseOwnerInfo($);
    expect(livesThere).toBeTruthy();
  });
});

test("doesn't live there, no homestead", () => {
  getMock("assessor-notlivethere.html", ($) => {
    const { livesThere } = parseOwnerInfo($);
    expect(livesThere).not.toBeTruthy();
  });
});
