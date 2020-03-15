import { JSONObject } from "puppeteer";

interface StreetType {
  options: string[];
  value: string;
}
const STREET_TYPES: StreetType[] = [
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
  { options: ["way", "wy"], value: "WY" }
];

export interface AssessorValues extends JSONObject {
  houseNumber: string;
  streetName: string;
  streetType: string;
  direction: string;
}

export function getAssessorValues(address: string): AssessorValues {
  if (!address) {
    throw new Error("no address supplied");
  }

  const addressPieces = address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/[NSEW]$/, "")
    .trim()
    .split(",");

  //  1234 N Main St, City Name, ST
  const assessorAddress = addressPieces[0];
  //  grab house number, direction, street name, sub-direction (to ignore) and street type
  const assessorPieces = assessorAddress.match(
    /(\d+) ([NSEW]) ([\w\s]+) ([NSEW]\s)?([A-Za-z]+)( [NSEW])?$/i
  );

  //  it either works perfectly or not at all
  if (!assessorPieces || assessorPieces.length < 6) {
    throw new Error(
      `Bad address\nGot ${assessorAddress}\nDecoded as: ${JSON.stringify(
        assessorPieces
      )}`
    );
  }

  //  clean up pieces with names
  const houseNumber = assessorPieces[1];
  const direction = assessorPieces[2];
  const streetName = assessorPieces[3];
  //  data massage the street type to match available types in Assessor search
  const streetTypeValue = assessorPieces[5].toLowerCase();
  const streetType = (
    STREET_TYPES.find(
      t =>
        t.options.includes(streetTypeValue) ||
        t.options.some(o => o.includes(streetTypeValue))
    ) || { value: "ST" }
  ).value;
  return { houseNumber, streetName, streetType, direction };
}
