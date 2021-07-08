const { parseLocation: parseAddress } = require("parse-address");

const getThatsThemUrl = (address) => {
  const { number, prefix, street, type, city, state } = parseAddress(address);

  //  not sure if it's possible to have city and not state
  //  but if the city's missing let's assume it's Tulsa for now
  if (!city) {
    address = `${number} ${prefix} ${street} ${type}, Tulsa, OK`;
  } else {
    address = `${number} ${prefix} ${street} ${type}, ${city}, ${state}`;
  }

  return `https://thatsthem.com/address/${address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/,? /g, "-")}`;
};

module.exports = {
  getThatsThemUrl,
};
