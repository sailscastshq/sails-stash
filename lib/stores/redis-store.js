const util = require('util')
const CacheStore = require('./cache-store')

function RedisStore(sails) {
  CacheStore.call(this, sails)
}

RedisStore.prototype = Object.create(CacheStore.prototype)
RedisStore.prototype.constructor = RedisStore
RedisStore.prototype.getStore = CacheStore.prototype.getStore

/**
 * Retrieves the value associated with the specified key from the cache store.
 * @param {string} key - The key to retrieve the value for.
 * @param {any | Function} [defaultValueOrCallback] - Optional. Default value or callback function.
 * @returns {Promise<any>} Promise resolving to the value associated with the key or default value.
 */
RedisStore.prototype.get = async function (key, defaultValueOrCallback) {
  const store = await this.getStore()
  const value = await store.leaseConnection(async function (db) {
    const cacheHit = await util.promisify(db.get).bind(db)(key)

    if (cacheHit === null) {
      if (typeof defaultValueOrCallback === 'function') {
        const defaultValue = await defaultValueOrCallback()
        return defaultValue
      } else {
        return defaultValueOrCallback
      }
    } else {
      return JSON.parse(cacheHit)
    }
  })
  return value
}
/**
 * Sets the value associated with the specified key in the cache store.
 * @param {string} key - The key for the value.
 * @param {any} value - The value to store.
 * @param {number} [ttlInSeconds] - Optional. Time to live for the key-value pair in seconds.
 * @returns {Promise<void>} Promise indicating completion of the set operation.
 */
RedisStore.prototype.set = async function (key, value, ttlInSeconds) {
  const store = await this.getStore()
  await store.leaseConnection(async function (db) {
    if (ttlInSeconds) {
      await util.promisify(db.setex).bind(db)(
        key,
        ttlInSeconds,
        JSON.stringify(value),
      )
    } else {
      await util.promisify(db.set).bind(db)(key, JSON.stringify(value))
    }
  })
}

/**
 * Checks if the cache store contains the specified key.
 * @param {string} key - The key to check.
 * @returns {Promise<boolean>} Promise resolving to true if the key exists, false otherwise.
 */
RedisStore.prototype.has = async function (key) {
  const cacheHit = await this.get(key)
  if (cacheHit) return true
  return false
}

/**
 * Deletes the key-value pair associated with the specified key from the cache store.
 * @param {string | string[]} key - The key to delete.
 * @returns {Promise<void>} Promise indicating completion of the delete operation.
 */
RedisStore.prototype.delete = async function (key) {
  const store = await this.getStore()
  const deletedCount = await store.leaseConnection(async function (db) {
    return await util.promisify(db.del).bind(db)(key)
  })
  return deletedCount
}
/**
 * Retrieves the value associated with the specified key from the cache store.
 * If the key exists in the cache, returns the corresponding value.
 * If the key does not exist in the cache, the provided default value or the result of the callback function will be stored in the cache and returned.
 * @param {string} key - The key to retrieve the value for.
 * @param {any | Function} [defaultValueOrCallback] - Optional. Default value or callback function to compute the default value.
 * @param {number} [ttlInSeconds] - Optional. Time to live for the key-value pair in seconds.
 * @returns {Promise<any>} A promise that resolves to the value associated with the key, or the default value if the key does not exist in the cache.
 */
RedisStore.prototype.fetch = async function (
  key,
  defaultValueOrCallback,
  ttlInSeconds,
) {
  const cacheHit = await this.get(key)
  if (!cacheHit) {
    let defaultValue
    if (typeof defaultValueOrCallback === 'function') {
      defaultValue = await defaultValueOrCallback()
    } else {
      defaultValue = defaultValueOrCallback
    }
    await this.set(key, defaultValue, ttlInSeconds)
    return defaultValue
  } else {
    return cacheHit
  }
}
/**
 * Adds a key-value pair to the cache store if the key does not already exist.
 * If the key already exists, the value is not updated.
 * @param {string} key - The key for the value.
 * @param {any} value - The value to store.
 * @param {number} [ttlInSeconds] - Optional. Time to live for the key-value pair in seconds.
 * @returns {Promise<boolean>} A promise that resolves to true if the key was added successfully, false if the key already exists.
 */
RedisStore.prototype.add = async function (key, value, ttlInSeconds) {
  const cacheHit = await this.get(key)
  if (!cacheHit) {
    await this.set(key, value, ttlInSeconds)
    return true
  } else {
    return false
  }
}
/**
 * Retrieves and removes the value associated with the specified key from the cache store.
 * If the key exists in the cache, returns the corresponding value and removes the key-value pair.
 * If the key does not exist, returns null.
 * @param {string} key - The key to retrieve and remove the value for.
 * @returns {Promise<any>} A promise that resolves to the value associated with the key, or null if the key does not exist in the cache.
 */
RedisStore.prototype.pull = async function (key) {
  const value = await this.get(key)
  await this.delete(key)
  return value
}
/**
 * Stores the specified key-value pair in the cache store indefinitely.
 * The key-value pair will not have an expiry time and will remain in the cache until explicitly removed.
 * @param {string} key - The key for the value.
 * @param {any} value - The value to store.
 * @returns {Promise<void>} A promise indicating completion of the operation.
 */
RedisStore.prototype.forever = async function (key, value) {
  await this.set(key, value)
}

/**
 * Destroys the cache store, removing all stored key-value pairs.
 * @returns {Promise<void>} A promise indicating completion of the operation.
 */
RedisStore.prototype.destroy = async function () {
  const store = await this.getStore()
  await store.leaseConnection(async function (db) {
    return await util.promisify(db.flushall).bind(db)('ASYNC')
  })
}

module.exports = RedisStore
