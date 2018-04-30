const https = require('https');
const fs = require('fs');
const {parse} = require('url');
const gather = require('./gather');

https
    .createServer({
            key: fs.readFileSync(process.env.SSL_KEY_PATH),
            cert: fs.readFileSync(process.env.SSL_CERT_PATH)
        },
        (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.setHeader('Access-Control-Request-Method', '*');
            res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
            res.setHeader('Access-Control-Allow-Headers', '*');

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
                            console.log(err);
                            res.writeHead(500);
                            res.end('{}');
                        });
                } else {
                    res.writeHead(404);
                    res.end('hi');
                }
            }
        })
    .listen(process.env.PORT || 3000);
