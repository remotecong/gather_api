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

test('does numbererd street name addresses', (t) => {
    t.plan(4);
    const addr = getAddress('601 W 32nd St, Broken Arrow, 74013');
    //return {houseNumber, streetName, streetType, direction};
    t.equal(addr.houseNumber, '601');
    t.equal(addr.streetName, '32nd');
    t.equal(addr.streetType, 'ST');
    t.equal(addr.direction, 'W');
});

test('does weird addresses where theres a direction after the name', (t) => {
    const addr = getAddress('3815 E. 116th Pl S, Tulsa, 74137');
    t.plan(4);
    t.equal(addr.streetName, '116th');
    t.equal(addr.houseNumber, '3815');
    t.equal(addr.streetType, 'PL');
    t.equal(addr.direction, 'E');
});
