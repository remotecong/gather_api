const Sentry = require('@sentry/node');
const { promisify } = require('bluebird');
const domget = promisify(require('@dillonchr/domget'));

const getThatsThemUrl = address =>  `https://thatsthem.com/address/${address.replace(/\s#\d+/, '').replace(/\./g, '').replace(/,? /g, '-')}`;

/**
 * looks up phone numbers using ThatsThem
 * @param browser
 * @param address
 * @returns {Promise<*>}
 */
const getThatsThemData = async (address) => {
    try {
        const url = getThatsThemUrl(address);
        Sentry.configureScope(scope => {
            scope.setTag('tt_url', url);
        });
        const doc = await domget({
            url: getThatsThemUrl(address),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:69.0) Gecko/20100101 Firefox/69.0'
            }
        });
        return Array.from(doc.querySelectorAll('.ThatsThem-people-record.row'))
            .map(result => {
                const name = result.querySelector('h2').text.trim();
                const numberElems = [...result.querySelectorAll('a')]
                    .filter((elem) => /Mobile|Landline/.test(elem.attributes['data-title']));
                return numberElems
                    .map((elem) => {
                        return {
                            name,
                            number: elem.text.trim(),
                            isMobile: elem.attributes['data-title'] === 'Mobile'
                        };
                    });
            })
            .reduce((arr, rec) => {
                return arr.concat(rec);
            }, [])
            .filter((p, i, a) => a.findIndex(rec => rec.number === p.number) === i);
    } catch (err) {
        err.thatsThem = true;
        Sentry.captureException(err);
        console.log('thatsthem error:', err);
    }
};

module.exports = {
    getThatsThemData,
    getThatsThemUrl
};
