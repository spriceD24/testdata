const { log, error } = require('./plus_utils');

function getPDFCacheKey(url, documentID)
{
	const cacheKey = `https://${url.hostname}/${documentID}`;
	return cacheKey;
}


module.exports = {
  getPDFCacheKey,
  addToCache,
  removeFromCache
};