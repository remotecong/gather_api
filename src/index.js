const http = require("http");
const { parse } = require("url");
const gather = require("./gather");
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_URL,
  environment: process.env.NODE_ENV || "dev"
});

function getIp(req) {
  try {
    return (
      (req.headers["x-forwarded-for"] || "").split(",").pop() ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress
    );
  } catch (ignore) {}
}

http
  .createServer(async (req, res) => {
    try {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader("Access-Control-Request-Method", "*");
      res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
      res.setHeader("Access-Control-Allow-Headers", "*");

      const query = parse(req.url, true).query;

      Sentry.configureScope(scope => {
        scope.clear();
        scope.setTag("ip", getIp(req));
        scope.setTag("ua", req.headers["user-agent"]);
        scope.setTag("query", query.address || "NO ADDRESS");
        scope.setTag("app", req.headers["x-app"] || "gather-v0");
      });

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (!query || !query.address) {
        Sentry.captureException(new Error("no query submitted"));
        res.writeHead(404);
        res.end("hi");
        return;
      }

      const data = await gather(query.address);

      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify(data));
    } catch (err) {
      console.log(err);
      Sentry.captureException(err);

      res.writeHead(500);
      res.end("{}");
    }
  })
  .listen(process.env.PORT || 3000);
