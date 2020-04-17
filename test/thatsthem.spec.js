jest.mock('../src/utils/cache.js');
const { getThatsThemUrl } = require("../src/thatsthem.js");


const tests = {
  "601 W Chestnut St, Broken Arrow, OK": "https://thatsthem.com/address/601-W-Chestnut-St-Broken-Arrow-OK",
  "601 W Chestnut St": "https://thatsthem.com/address/601-W-Chestnut-St-Tulsa-OK",
};

test("converts all urls with city/state", () => {
  Object.entries(tests)
    .forEach(([q, out]) => {
      expect(getThatsThemUrl(q)).toBe(out);
    });
});

