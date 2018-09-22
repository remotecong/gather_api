const test = require('tape');
const getAddress = require('../getAddress');

test('does normal addresses', (t) => {
    t.plan(4);
    const addr = getAddress('601 W Chestnut St, Broken Arrow, 74013');
    //return {houseNumber, streetName, streetType, direction};
    t.equal(addr.houseNumber, '601');
    t.equal(addr.streetName, 'Chestnut');
    t.equal(addr.streetType, 'ST');
    t.equal(addr.direction, 'W');
});

test('does two-worded street name addresses', (t) => {
    t.plan(4);
    const addr = getAddress('601 W Chest Nut St, Broken Arrow, 74013');
    //return {houseNumber, streetName, streetType, direction};
    t.equal(addr.houseNumber, '601');
    t.equal(addr.streetName, 'Chest Nut');
    t.equal(addr.streetType, 'ST');
    t.equal(addr.direction, 'W');
});
