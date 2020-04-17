const { parseLocation: parseAddress } = require('parse-address');

const STREET_TYPES = [
  { options: ["street"], value: "ST" },
  { options: ["avenue"], value: "AV" },
  { options: ["place"], value: "PL" },
  { options: ["road", "rd"], value: "RD" },
  { options: ["court", "ct"], value: "CT" },
  { options: ["circle"], value: "CR" },
  { options: ["drive"], value: "DR" },
  { options: ["lane", "ln"], value: "LN" },
  { options: ["park", "pr", "pk"], value: "PK" },
  { options: ["boulevard", "blvd"], value: "BV" },
  { options: ["expressway", "expwy"], value: "EX" },
  { options: ["highway", "hwy"], value: "HY" },
  { options: ["terrace", "tr"], value: "TE" },
  { options: ["trail", "tl"], value: "TL" },
  { options: ["way", "wy"], value: "WY" },
];

const getAssessorValues = (address) => {
  const { number: houseNumber, street, prefix: direction, type } = parseAddress(address);

  if (!houseNumber || !street || !direction || !type) {
    return {
      error: `Bad address "${address}"`,
      input: address,
      decoded: parseAddress(address),
    };
  }

  //  clean up pieces with names
  const streetName = street.replace(/ [NEWS]$/, '');
  //  data massage the street type to match available types in Assessor search
  const streetTypeValue = type.toLowerCase();
  const streetType = (
    STREET_TYPES.find(
      (t) =>
      t.options.includes(streetTypeValue) ||
      t.options.some((o) => o.includes(streetTypeValue))
    ) || { value: "ST" }
  ).value;

  return {
    ln: "",
    fn: "",
    srchbox: "on",
    streetno: houseNumber,
    predirection: direction,
    streetname: streetName,
    streettype: streetType,
    subaddr: "Search+by+address",
    subdivname: "",
    subdivnum: "",
    subdivlot: "",
    subdivblk: "",
    account: "",
    parcel: "",
    accepted: "accepted",
  };
};

module.exports = getAssessorValues;
