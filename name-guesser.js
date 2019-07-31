const getLastName = (rawName) => {
    const lastName = rawName
        .replace(/( the| ttee| revocable| rev| trustee| trust| Living| \d+)/gi, '')
        .split(',')
        .map(s => s.trim())
        .shift();

    if (lastName.match(/\s/g)) {
        return lastName.match(/^[^\s]+\s/)[0].trim();
    }
    return lastName;
};

module.exports = (rawName) => {
    const name = rawName
        .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
        .replace(/\sAnd\s/g, ' & ')
        .replace(/\s[A-Z]\s/g, ' ')
        .split(', ')
        .reverse()
        .join(' ')
        .replace(/( the| ttees?| revocable| rev| trustees?| trust| Living| \d+| c\/o)/gi, '')
        .trim();
    return {name, lastName: getLastName(rawName)};
};

