jest.mock('../src/utils/cache.js');
const { getThatsThemUrl, parseThatsThemData } = require("../src/thatsthem.js");
const cheerio = require("cheerio");
const fs = require("fs");

function getMock(name, fn) {
  fs.readFile(`test/mocks/${name}`, (err, data) => {
    expect(err).not.toBeTruthy();
    fn(cheerio.load(data));
  });
}


const tests = {
  "601 W Chestnut St, Broken Arrow, OK": "https://thatsthem.com/address/601-W-Chestnut-St-Broken-Arrow-OK",
  "601 W Chestnut St": "https://thatsthem.com/address/601-W-Chestnut-St-Tulsa-OK",
  "1234 e 59th st s tulsa ok": "https://thatsthem.com/address/1234-e-59th-st-s-tulsa-ok",
};

test("converts all urls with city/state", () => {
  Object.entries(tests)
    .forEach(([q, out]) => {
      expect(getThatsThemUrl(q)).toBe(out);
    });
});

test("bad lookups throw error", (done) => {
  getMock("bad-thatsthem.html", (data) => {
    expect(() => {
      parseThatsThemData(data);
    }).toThrow(/^thatsthem php error thrown$/);
    done();
  });
});

