const test = require("tape");
const parseOwnerInfo = require("../src/owner-lookups/tulsa/assessor-parser");
const cheerio = require("cheerio");
const fs = require("fs");

function getMock(name, t, fn) {
  fs.readFile(`test/mocks/${name}`, (err, data) => {
    t.error(err);
    fn(cheerio.load(data));
  });
}

test("lives there, mailing address matches", (t) => {
  getMock("assessor-livesthere.html", t, ($) => {
    const { lastName, livesThere, mailingAddress, ownerName } = parseOwnerInfo(
      $
    );
    t.equal(lastName, "CHRISTENSEN");
    t.ok(livesThere);
    t.equal(mailingAddress, "11106 S 108TH EAST AVE, BIXBY, OK 74008");
    t.equal(ownerName, "CHRISTENSEN, JUSTIN D");
    t.end();
  });
});

test("lives there, mailing address mismatch, homestead & pobox", (t) => {
  getMock("assessor-livesthere-homestead.html", t, ($) => {
    const { livesThere } = parseOwnerInfo($);
    t.ok(livesThere);
    t.end();
  });
});

test("doesn't live there, no homestead", (t) => {
  getMock("assessor-notlivethere.html", t, ($) => {
    const { livesThere } = parseOwnerInfo($);
    t.notOk(livesThere);
    t.end();
  });
});
