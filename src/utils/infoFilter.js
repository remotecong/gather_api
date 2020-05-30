module.exports = {
  infoFilter,
  filterPhoneDataForName
};

function filterPhoneDataForName(phoneData, lastName) {
  const re = new RegExp(lastName + "( jn?r| sn?r| ii| iii)?$", "i");

  return (
    phoneData
      .filter(({ name, number }) => number && re.test(name))
      //  max numbers 2 for any search
      .slice(0, 2)
      .map(({ number, isMobile }) => ({
        number,
        type: isMobile ? "mobile" : "landline"
      }))
  );
}

function infoFilter(ownerData, thatsThemData) {
  if (ownerData.livesThere) {
    //  we only want results that match lastName
    return {
      name: ownerData.ownerName,
      livesThere: ownerData.livesThere,
      phones: filterPhoneDataForName(thatsThemData, ownerData.lastName)
    };
  }

  const renterName = thatsThemData.find(({ name }) => !name.toUpperCase().includes(ownerData.lastName));

  //  who is first thatsthem result without lastName?
  if (renterName) {
    const lastName = renterName.name.split(" ").pop();

    return {
      name: renterName.name,
      livesThere: true,
      phones: filterPhoneDataForName(thatsThemData, lastName)
    };
  }

  //  owner doesn't live there
  //  no renter infos
  //  return _OWNER_NAME or Current Resident_

  return {
    name: ownerData.ownerName,
    phones: [],
    livesThere: false,
    orCurrentResident: true
  };
}
