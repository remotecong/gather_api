const getAddress = require("../src/owner-lookups/tulsa/getAddress");

test("does normal addresses", () => {
  const addr = getAddress("601 W Chestnut St, Broken Arrow, 74013");
  //return {streetno, streetname, streettype, predirection};
  expect(addr.streetno).toBe("601");
  expect(addr.streetname).toBe("Chestnut");
  expect(addr.streettype).toBe("ST");
  expect(addr.predirection).toBe("W");
});

test("does two-worded street name addresses", () => {
  const addr = getAddress("601 W Chest Nut St, Broken Arrow, 74013");
  //return {streetno, streetname, streettype, predirection};
  expect(addr.streetno).toBe("601");
  expect(addr.streetname).toBe("Chest Nut");
  expect(addr.streettype).toBe("ST");
  expect(addr.predirection).toBe("W");
});

test("does numbererd street name addresses", () => {
  const addr = getAddress("601 W 32nd St, Broken Arrow, 74013");
  //return {streetno, streetname, streettype, predirection};
  expect(addr.streetno).toBe("601");
  expect(addr.streetname).toBe("32nd");
  expect(addr.streettype).toBe("ST");
  expect(addr.predirection).toBe("W");
});

test("does weird addresses where theres a predirection after the name", () => {
  const addr = getAddress("3815 E. 116th Pl S, Tulsa, 74137");
  expect(addr.streetname).toBe("116th");
  expect(addr.streetno).toBe("3815");
  expect(addr.streettype).toBe("PL");
  expect(addr.predirection).toBe("E");
});
