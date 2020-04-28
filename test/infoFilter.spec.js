const infoFilter = require("../src/utils/infoFilter.js");

const compareResults = (ownerData, phoneData, expected) => {
  const actual = infoFilter(ownerData, phoneData);
  Object.entries(expected)
    .forEach(([key, val]) => {
      expect(actual[key]).toBe(val);
    });
};


test("owner lives there and has number", () => {
  const ownerData = {
    mailingAddress: "123 W Main St",
    lastName: "SMITH",
    ownerName: "SMITH, BILL E.",
    livesThere: 1,
  };

  const phoneData = [
    {name: "Bill Smith", phone: "555-555-1234"},
    {name: "Bill Smith", phone: "555-111-1234"},
    {name: "Bill Smith", phone: "555-222-1234"},
    {name: "Bill Smithers", phone: "555-666-1234"},
    {name: "Bill Dauterive", phone: "555-555-1234"},
  ];

  const result = infoFilter(ownerData, phoneData);
  expect(result.name).toBe("SMITH, BILL E.");
  expect(result.phones.length).toBe(2);
  expect(result.phones[0].number).toBe("555-555-1234");
  expect(result.phones[1].number).toBe("555-111-1234");
});

test("owner lives there and no number", () => {
  const ownerData = {
    mailingAddress: "123 W Main St",
    lastName: "SMITH",
    ownerName: "SMITH, BILL E.",
    livesThere: 1,
  };

  const phoneData = [
    {name: "Bill Hill", phone: "555-555-1234"},
    {name: "Bill Dauterive", phone: "555-555-1234"},
  ];

  const result = infoFilter(ownerData, phoneData);
  expect(result.name).toBe("SMITH, BILL E.");
  expect(result.phones.length).toBe(0);
});

test("renter and has number", () => {
  const ownerData = {
    mailingAddress: "123 W Main St",
    lastName: "SMITH",
    ownerName: "SMITH, BILL E.",
    livesThere: 0,
  };

  const phoneData = [
    {name: "Bill Smith", phone: "555-555-1234"},
    {name: "Bill Hill", phone: "555-555-1234"},
    {name: "Wanda Hill", phone: "555-322-5555", isMobile: 1},
    {name: "Bill Dauterive", phone: "555-555-1234"},
  ];

  const result = infoFilter(ownerData, phoneData);
  expect(result.name).toBe("Bill Hill");
  expect(result.phones.length).toBe(2);
  expect(result.phones[0]).toEqual({number: "555-555-1234", type: "landline"});
  expect(result.phones[1]).toEqual({number: "555-322-5555", type: "mobile"});
});

test("renter and no number", () => {
  const ownerData = {
    mailingAddress: "123 W Main St",
    lastName: "SMITH",
    ownerName: "SMITH, BILL E.",
    livesThere: 0,
  };

  const phoneData = [
    {name: "Bill Grambles"},
    {name: "Bill Hill", phone: "555-555-1234"},
    {name: "Bill Dauterive", phone: "555-555-1234"},
  ];

  const result = infoFilter(ownerData, phoneData);
  expect(result.name).toBe("Bill Grambles");
  expect(result.phones.length).toBe(0);
});

test("owner doesn't live there and no renters", () => {
  const ownerData = {
    mailingAddress: "123 W Main St",
    lastName: "SMITH",
    ownerName: "SMITH, BILL E.",
    livesThere: 0,
  };

  const phoneData = [];

  const result = infoFilter(ownerData, phoneData);
  expect(result.name).toBe("SMITH, BILL E.");
  expect(result.phones.length).toBe(0);
  expect(result.orCurrentResident).toBeTruthy();
});
