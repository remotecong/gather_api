import Sentry from "@sentry/node";
import { promisify } from "bluebird";
import _domget from "@dillonchr/domget";
const domget = promisify(_domget);

export function getThatsThemUrl(address: string) {
  return `https://thatsthem.com/address/${address
    .replace(/\s#\d+/, "")
    .replace(/\./g, "")
    .replace(/,? /g, "-")}`;
}

export interface ThatsThemRecord {
  name: string;
  number: string;
  isMobile: boolean;
}

export async function getThatsThemData(address: string): Promise<ThatsThemRecord[] | never> {
  const url = getThatsThemUrl(address);

  Sentry.configureScope(scope => {
    scope.setTag("tt_url", url);
  });

  const document = await domget({
    url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:72.0) Gecko/20100101 Firefox/72.0"
    }
  });

  return Array.from(document.querySelectorAll(".ThatsThem-people-record.row"))
    .map(elem => {
      const h2 = elem.querySelector("h2");
      const name = h2 ? h2.text.trim() : "";

      return Array.from(elem.querySelectorAll("a"))
        .filter(a => a.attributes.href && /^\/phone/.test(a.attributes.href))
        .map(a => {
          return {
            name,
            number: a.text.trim(),
            isMobile: a.attributes["data-title"] === "Mobile"
          };
        });
    })
    .reduce((arr, cur) => arr.concat(cur), [])
    .filter((p, i, a) => {
      return p.number && a.findIndex(({ number }) => number === p.number) === i;
    });
}
