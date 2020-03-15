export function getLastName(rawName: string) {
  const lastName = rawName
    .replace(/( the| ttee| revocable| rev| trustee| trust| Living| \d+)/gi, "")
    .split(",")
    .map(s => s.trim())
    .shift();

  if (lastName && lastName.match(/\s/g)) {
    const firstNameListed = lastName.match(/^[^\s]+\s/);
    if (firstNameListed) {
      return firstNameListed[0].trim();
    }
  }
  return lastName;
}

export function guessName(rawName: string) {
  const name = rawName
    .replace(
      /\w\S*/g,
      txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    )
    .replace(/\sAnd\s/g, " & ")
    .replace(/\s[A-Z]\s/g, " ")
    .split(", ")
    .reverse()
    .join(" ")
    .replace(
      /( the| ttees?| revocable| rev| trustees?| trust| Living| \d+| c\/o)/gi,
      ""
    )
    .trim();
  return { name, lastName: getLastName(rawName) };
}
