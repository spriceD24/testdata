const { log, error } = require('./plus_utils');


const CACHE_OPTIONS = {expirationTtl: 432000 }; //5 days TTL

export class CloudflareCache {
  constructor(mycache) {
    this.cache = mycache;
  }

  async addToCache(cacheKey, obj) {
    log(`Adding to cache ${cacheKey}`)
    this.cache.put(cacheKey, obj.clone(), options);
  }

  async getFromCache(cacheKey) {
    log(`Looking up in cache ${cacheKey}`)
    return this.cache.match(cacheKey);
  }
  
  async removeFromCache(cacheKey) {
    log(`Removing cache ${cacheKey}`)
    return this.cache.delete(cacheKey);
  }
}