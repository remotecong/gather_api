import http from "http";
import { parse } from "url";
import gather from "./gather";
import Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_URL });

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
    res.setHeader("Access-Control-Allow-Headers", "*");

    Sentry.configureScope(scope => {
      scope.clear();
      scope.setTag("ip", req.connection.remoteAddress || 'unknown');
      scope.setTag("ua", req.headers["user-agent"] || 'unknown');
    });

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
    } else if (req.url) {
      const query = parse(req.url, true).query;
      if (query && query.address && typeof query.address == 'string') {
        gather(query.address)
          .then((data: any) => {
            res.writeHead(200);
            res.end(JSON.stringify(data));
          })
          .catch((err: Error) => {
            Sentry.withScope(scope => {
              scope.setTag("query", typeof query.address == 'string' ? query.address : 'unknown');
              Sentry.captureException(err);
            });
            console.log(err);
            res.writeHead(500);
            res.end("{}");
          });
      } else {
        Sentry.captureException(new Error("no query submitted"));
        res.writeHead(404);
        res.end("hi");
      }
    }
  })
  .listen(process.env.PORT || 3000);
