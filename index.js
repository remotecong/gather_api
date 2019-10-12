const http = require('http');
const {parse} = require('url');
const gather = require('./gather');
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_URL});

http
    .createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        res.setHeader('Access-Control-Allow-Headers', '*');
        Sentry.configureScope(scope => {
            scope.setTag('ip', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
            scope.setTag('ua', req.headers['user-agent']);
        });

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
        } else {
            const query = parse(req.url, true).query;
            if (query && query.address) {
                gather(query.address)
                    .then(data => {
                        res.writeHead(200);
                        res.end(JSON.stringify(data))
                    })
                    .catch(err => {
                        Sentry.captureException(err);
                        console.log(err);
                        res.writeHead(500);
                        res.end('{}');
                    });
            } else {
                Sentry.captureException(new Error('no query submitted'));
                res.writeHead(404);
                res.end('hi');
            }
        }
    })
    .listen(process.env.PORT || 3000);
