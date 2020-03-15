import redis from "redis";
import { promisify } from "bluebird";

const client = redis.createClient({
  host: "redis"
});

const _getVal = promisify(client.get, { context: client });
const _setVal = promisify(client.setex, { context: client });

export async function setVal(key: string, val: string) {
  return await _setVal(key, 3600, val);
}

export async function getVal(key: string) {
  return await _getVal(key);
}
