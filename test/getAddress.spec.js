const test = require("tape");
const getAddress = require("../src/owner-lookups/tulsa/getAddress");

test("does normal addresses", (t) => {
  const addr = getAddress("601 W Chestnut St, Broken Arrow, 74013");
  //return {streetno, streetname, streettype, predirection};
  t.equal(addr.streetno, "601");
  t.equal(addr.streetname, "Chestnut");
  t.equal(addr.streettype, "ST");
  t.equal(addr.predirection, "W");
  t.end();
});

test("does two-worded street name addresses", (t) => {
  const addr = getAddress("601 W Chest Nut St, Broken Arrow, 74013");
  //return {streetno, streetname, streettype, predirection};
  t.equal(addr.streetno, "601");
  t.equal(addr.streetname, "Chest Nut");
  t.equal(addr.streettype, "ST");
  t.equal(addr.predirection, "W");
  t.end();
});

test("does numbererd street name addresses", (t) => {
  const addr = getAddress("601 W 32nd St, Broken Arrow, 74013");
  //return {streetno, streetname, streettype, predirection};
  t.equal(addr.streetno, "601");
  t.equal(addr.streetname, "32nd");
  t.equal(addr.streettype, "ST");
  t.equal(addr.predirection, "W");
  t.end();
});

test("does weird addresses where theres a predirection after the name", (t) => {
  const addr = getAddress("3815 E. 116th Pl S, Tulsa, 74137");
  t.equal(addr.streetname, "116th");
  t.equal(addr.streetno, "3815");
  t.equal(addr.streettype, "PL");
  t.equal(addr.predirection, "E");
  t.end();
});
