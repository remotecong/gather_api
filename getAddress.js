/**
 * the available street type values for assessor searches,
 * some have been left out due to their absurdity (e.g. E, W)
 * @type {*[]}
 */
const STREET_TYPES = [
    {options: ["street"], value: "ST"},
    {options: ["avenue"], value: "AV"},
    {options: ["place"], value: "PL"},
    {options: ["road", "rd"], value: "RD"},
    {options: ["court", "ct"], value: "CT"},
    {options: ["circle"], value: "CR"},
    {options: ["drive"], value: "DR"},
    {options: ["lane", "ln"], value: "LN"},
    {options: ["park", "pr", "pk"], value: "PK"},
    {options: ["boulevard", "blvd"], value: "BV"},
    {options: ["expressway", "expwy"], value: "EX"},
    {options: ["highway", "hwy"], value: "HY"},
    {options: ["terrace", "tr"], value: "TE"},
    {options: ["trail", "tl"], value: "TL"},
    {options: ["way", "wy"], value: "WY"}
];

/**
 * returns assessor required values for running property search
 * @param address
 * @returns {*}
 */
const getAssessorValues = address => {
    //  1234 N Main St, City Name, ST
    const assessorAddress = address
        //  ditch everything after the first comma
        .split(',')
        //  just give me the street address, we know it's in tulsa
        .shift()
        //  strip away all periods (e.g. "S.")
        .replace(/\./g, '')
        //  reduce any directional words to be their single character to help me match later
        .replace(/\sEast\s/ig, ' E ')
        .replace(/\sNorth\s/ig, ' N ')
        .replace(/\sSouth\s/ig, ' S ')
        .replace(/\sWest\s/ig, 'W');
    //  grab house number, direction, street name, sub-direction (to ignore) and street type
    const assessorPieces = assessorAddress.match(/(\d+) ([NSEW]) ([\w\s]+) ([NSEW]\s)?([A-Za-z]+)( [NSEW])?$/i);

    //  it either works perfectly or not at all
    if (!assessorPieces || assessorPieces.length < 6) {
        return {error: `Bad address\nGot ${assessorAddress}\nDecoded as: ${JSON.stringify(assessorPieces)}`, input: address, decoded: assessorPieces};
    }

    //  clean up pieces with names
    const houseNumber = assessorPieces[1];
    const direction = assessorPieces[2];
    const streetName = assessorPieces[3];
    //  data massage the street type to match available types in Assessor search
    const streetTypeValue = assessorPieces[5].toLowerCase();
    const streetType = (STREET_TYPES.find(t => t.options.includes(streetTypeValue) || t.options.some(o => o.includes(streetTypeValue))) || {value: 'ST'}).value;
    return {houseNumber, streetName, streetType, direction};
};

module.exports = getAssessorValues;