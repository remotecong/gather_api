const http = require('http');
const {parse} = require('url');
const gather = require('./gather');
//  added comment to trigger rebuild in heroku

http
    .createServer((req, res) => {
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
