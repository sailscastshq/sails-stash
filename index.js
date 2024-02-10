const RedisStore = require('./lib/stores/redis-store')

module.exports = function defineSailsCacheHook(sails) {
  return {
    defaults: {
      stash: {
        cachestore: 'default',
      },
      cachestores: {
        default: {
          store: 'redis',
          datastore: 'cache',
        },
      },
    },
    initialize: async function () {
      function getCacheStore(cachestore) {
        if (!sails.config.cachestores[cachestore]) {
          throw new Error('The provided cachestore coult not be found.')
        }
        switch (sails.config.cachestores[cachestore].store) {
          case 'redis':
            return new RedisStore(sails)
          default:
            throw new Error(
              'Invalid store provided, supported stores are redis or memcached.',
            )
        }
      }

      let cacheStore = getCacheStore(sails.config.stash.cachestore)

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
        store: function (cachestore) {
          return getCacheStore(cachestore)
        },
      }
    },
  }
}
