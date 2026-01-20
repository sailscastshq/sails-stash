const RedisStore = require('./lib/stores/redis-store')
const MemoryStore = require('./lib/stores/memory-store')

module.exports = function defineSailsCacheHook(sails) {
  return {
    defaults: {
      stash: {
        cachestore: 'default',
      },
      cachestores: {
        default: {
          store: 'memory',
        },
      },
    },
    initialize: async function () {
      function getCacheStore(cachestore) {
        if (!sails.config.cachestores[cachestore]) {
          throw new Error('The provided cachestore coult not be found.')
        }
        switch (sails.config.cachestores[cachestore].store) {
          case 'memory':
            return new MemoryStore(sails)
          case 'redis':
            return new RedisStore(sails)
          default:
            throw new Error(
              'Invalid store provided, supported stores are memory and redis.',
            )
        }
      }

      let cacheStore = getCacheStore(sails.config.stash.cachestore)

      if (
        sails.config.cachestores[sails.config.stash.cachestore].store ===
          'memory' &&
        sails.config.environment === 'production'
      ) {
        sails.log.warn(
          'Sails Stash is using the memory store in production. ' +
            'This is not recommended for production environments. ' +
            'Consider switching to a persistent cache store. ' +
            'See: https://docs.sailscasts.com/sails-stash/redis',
        )
      }

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
