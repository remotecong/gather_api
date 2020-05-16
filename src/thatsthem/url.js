const { parseLocation: parseAddress } = require("parse-address");

const getThatsThemUrl = address => {
  const { number, prefix, street, type, city } = parseAddress(address);

  //  not sure if it's possible to have city and not state
  //  but if the city's missing let's assume it's Tulsa for now
  if (!city) {
    address = `${number} ${prefix} ${street} ${type}, Tulsa, OK`;
  }

  return `https://thatsthem.com/address/${address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/,? /g, "-")}`;
};

module.exports = {
  getThatsThemUrl
};
