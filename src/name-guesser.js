const getLastName = rawName => {
  const lastName = rawName
    .replace(/( the| ttee| revocable| rev| trustee| trust| Living| \d+)/gi, "")
    .split(",")
    .map(s => s.trim())
    .shift();

  if (lastName.match(/\s/g)) {
    return lastName.match(/^[^\s]+\s/)[0].trim();
  }
  return lastName;
};

module.exports = getLastName;
