const cheerio = require("cheerio");

function parseThatsThemData(html) {
  if (/<b>Fatal error<\/b>/.test(html)) {
    throw new Error("thatsthem php error thrown");
  }

  if (/We did not find any results for your query/.test(html)) {
    throw new Error("thatsthem can't find address");
  }

  const $ = cheerio.load(html);

  //  iterate over each record a for a resident
  return $(".ThatsThem-people-record.row")
    .toArray()
    .reduce((coll, elem) => {
      const row = $(elem);
      const name = row.find("h2").text().trim();
      let addedPerson = false;

      //  iterate over each phone number for a given resident
      row.find('span[itemprop="telephone"]').each((i, span) => {
        const link = $(span).parent();
        const number = link.text().trim();

        if (!coll.some(p => p.number === number)) {
          coll.push({
            name,
            number,
            isMobile: link.attr("data-title") === "Mobile"
          });

          addedPerson = true;
        }
      });

      //  add renter even if no numbers found
      if (!addedPerson) {
        coll.push({ name });
      }

      return coll;
    }, []);
}

module.exports = {
  parseThatsThemData
};
