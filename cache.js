const redis = require('redis');
const { promisify } = require('bluebird');
const client = redis.createClient({
    host: 'redis'
});
const _getVal = promisify(client.get, {context: client});
const _setVal = promisify(client.set, {context: client});
const setVal = async (key, val) => {
    return await client.setex(key, 3600, val);
};
const getVal = async (key) => {
    return await _getVal(key);
};
module.exports = {
    getVal,
    setVal
};
