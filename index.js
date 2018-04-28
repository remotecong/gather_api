const http = require('http');
const {parse} = require('url');
const gather = require('./gather');

http
    .createServer((req, res) => {
        const query = parse(req.url, true).query;
        if (query && query.address) {
            gather(process.argv[2])
                .then(data => res.end(JSON.stringify(data)))
                .catch(err => res.end('{}'));
        }
    })
    .listen(process.env.PORT || 3000);