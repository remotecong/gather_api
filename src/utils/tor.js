const axios = require("axios");
const SocksProxyAgent = require('socks-proxy-agent');
const Tor = require("@dillonchr/tor-manager");

const httpsAgent = new SocksProxyAgent(process.env.TOR_SOCKS_PROXY_ADDRESS || "socks5://localhost:9050");

let isFirstRequest = true;

async function resetIp() {
  return await Tor.restart();
}

async function buildFetcher(opts) {
  if (isFirstRequest) {
    isFirstRequest = false;
    await Tor.start();
  }

  return axios.create({ httpsAgent, ...opts });
}

module.exports = {
  getFetcher: buildFetcher,
  resetIp,
  kill: Tor.kill,
};

