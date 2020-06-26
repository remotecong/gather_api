const fastify = require("fastify")({ logger: true });
const gather = require("./gather");
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_URL,
  environment: process.env.NODE_ENV || "dev",
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

fastify.register(require("fastify-cors"), {
  origin: "*",
  methods: ["GET", "OPTIONS", "HEAD", "POST"],
  allowedHeaders: "*",
});

fastify.get("/tulsa", async (request, reply) => {
  const { address } = request.query;
  if (address) {
    try {
      return await gather(address);
    } catch (err) {
      return { error: err.toString() };
    }
  }
  return { hello: "world" };
});

fastify.post("/tulsa", async (request, reply) => {
  if (request.body) {
    const addresses = JSON.parse(request.body);
    if (addresses.length) {
      const results = [];
      for (const a of addresses) {
        try {
          const result = await gather(a);
          results.push([a, result]);
        } catch (err) {
          results.push([a, { error: err }]);
        }
        const percentComplete = (results.length / addresses.length) * 100;
        const bar = Array(10)
          .fill("_")
          .map((_, i) => ((i + 1) * 10 <= percentComplete ? "*" : "_"))
          .join("");
        console.log("%s %d%", bar, percentComplete);
      }
      return results;
    }
  } else {
    return { error: "no body" };
  }
});

fastify.setNotFoundHandler(async (request, reply) => {
  return { idk: true };
});

async function start() {
  try {
    await fastify.listen(process.env.PORT || 3000, "0.0.0.0");
    fastify.log.info(`gather_api ok :: ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
