jest.mock('../src/utils/cache.js');
const { getThatsThemUrl } = require("../src/thatsthem/url.js");
const { parseThatsThemData } = require("../src/thatsthem/parse.js");
const fs = require("fs");

function getMock(name, fn) {
  fs.readFile(`test/mocks/${name}`, (err, data) => {
    expect(err).not.toBeTruthy();
    if (data) {
      fn(data);
    }
  });
}


const tests = {
  "601 W Chestnut St, Broken Arrow, OK": "https://thatsthem.com/address/601-W-Chestnut-St-Broken-Arrow-OK",
  "601 W Chestnut St": "https://thatsthem.com/address/601-W-Chestnut-St-Tulsa-OK",
  "1234 e 59th st s tulsa ok": "https://thatsthem.com/address/1234-e-59th-st-s-tulsa-ok",
  "4321 s 84th e ave, tulsa": "https://thatsthem.com/address/4321-s-84th-e-Ave-Tulsa-OK",
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

test("good lookup finds numbers", (done) => {
  getMock("thatsthem.html", (html) => {
    let results;

    expect(() => {
      results = parseThatsThemData(html);
    }).not.toThrow();

    expect(results[0].name).toBe('Jara G Doe');
    expect(results[0].number).toBe('918-555-5838');
    expect(results[0].isMobile).toBeTruthy();

    done();
  });
});

test("lookup doesn't have a match on thatsthem", (done) => {
  getMock("not-found-thatsthem.html", (html) => {
    let results;

    expect(() => {
      parseThatsThemData(html);
    }).toThrow(/^thatsthem can't find address$/);

    done();
  });
});

