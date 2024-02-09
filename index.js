const RedisStore = require('./lib/stores/redis-store');

module.exports = function defineSailsCacheHook(sails) {

  return {
    defaults: {
      stash: {
        store: process.env.CACHE_STORE || 'redis',
        stores: {
          redis: {
            store: 'redis',
            datastore: 'cache'
          },
          memcached: {
            store: 'memcached',
            datastore: 'cache'
          },
        }
      }
    },
    initialize: async function () {
      function getCacheStore(store) {
        switch (sails.config.stash.stores[store].store) {
          case 'redis':
            return new RedisStore(sails);
          default:
            throw new Error('Invalid cache store provided')
        }
      }

      let cacheStore = getCacheStore(sails.config.stash.stores[sails.config.stash.store].store)

      sails.cache = {
          get: cacheStore.get.bind(cacheStore),
          set: cacheStore.set.bind(cacheStore),
          has: cacheStore.has.bind(cacheStore),
          delete: cacheStore.delete.bind(cacheStore),
          fetch: cacheStore.fetch.bind(cacheStore),
          add: cacheStore.add.bind(cacheStore),
          pull: cacheStore.pull.bind(cacheStore),
          forever: cacheStore.forever.bind(cacheStore),
          destroy: cacheStore.destroy.bind(cacheStore),
          store: function(store) {
            return getCacheStore(store)
          }
      }
    }
  };
};
