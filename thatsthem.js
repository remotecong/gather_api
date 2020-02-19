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
        console.log('URL', url);
        Sentry.configureScope(scope => {
            scope.setTag('tt_url', url);
        });

        const $ = await domget({
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:72.0) Gecko/20100101 Firefox/72.0',
            },
        });
        const rows = $('.ThatsThem-people-record.row');
        console.log('FOUND', rows.length, 'results');
        const results = Array(rows.length).fill('')
            .map((ignore, i) => {
                const root = rows[i];
                return {
                    name: safeTrim($(root).find('h2').text()),
                    number: safeTrim($(root).find('a[data-title*="Mobile"], a[data-title*="Landline"]').text()),
                    isMobile: !!$(root).find('a[data-title*="Mobile"]').length,
                };
            })
            .reduce((arr, cur) => arr.concat(cur), [])
            .filter((p, i, a) => a.findIndex(({ number }) => number === p.number) === i);
        return results;
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
