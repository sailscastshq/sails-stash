const CacheStore = require('./cache-store')

class SQLiteStore extends CacheStore {
  #cleanupInterval = null
  #initialized = false

  constructor(sails) {
    super(sails)
    this.#startCleanup()
  }

  async #ensureTable() {
    if (this.#initialized) return
    const store = await this.getStore()
    await store.sendNativeQuery(
      'CREATE TABLE IF NOT EXISTS _cache (key TEXT PRIMARY KEY, value TEXT, expires_at INTEGER)',
    )
    this.#initialized = true
  }

  #startCleanup() {
    this.#cleanupInterval = setInterval(async () => {
      try {
        if (!this.#initialized) return
        const store = await this.getStore()
        await store.sendNativeQuery(
          'DELETE FROM _cache WHERE expires_at IS NOT NULL AND expires_at <= ?',
          [Date.now()],
        )
      } catch (err) {
        // Silently ignore cleanup errors
      }
    }, 60000)

    if (this.#cleanupInterval.unref) {
      this.#cleanupInterval.unref()
    }
  }

  #stopCleanup() {
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval)
      this.#cleanupInterval = null
    }
  }

  /**
   * Retrieves the value associated with the specified key from the cache store.
   * @param {string} key - The key to retrieve the value for.
   * @param {any | Function} [defaultValueOrCallback] - Optional. Default value or callback function.
   * @returns {Promise<any>} Promise resolving to the value associated with the key or default value.
   */
  async get(key, defaultValueOrCallback) {
    await this.#ensureTable()
    const store = await this.getStore()
    const result = await store.sendNativeQuery(
      'SELECT value, expires_at FROM _cache WHERE key = ?',
      [key],
    )
    const row = result.rows[0]

    if (!row) {
      if (typeof defaultValueOrCallback === 'function') {
        return await defaultValueOrCallback()
      }
      return defaultValueOrCallback
    }

    if (row.expires_at && row.expires_at <= Date.now()) {
      await store.sendNativeQuery('DELETE FROM _cache WHERE key = ?', [key])
      if (typeof defaultValueOrCallback === 'function') {
        return await defaultValueOrCallback()
      }
      return defaultValueOrCallback
    }

    return JSON.parse(row.value)
  }

  /**
   * Sets the value associated with the specified key in the cache store.
   * @param {string} key - The key for the value.
   * @param {any} value - The value to store.
   * @param {number} [ttlInSeconds] - Optional. Time to live for the key-value pair in seconds.
   * @returns {Promise<void>} Promise indicating completion of the set operation.
   */
  async set(key, value, ttlInSeconds) {
    await this.#ensureTable()
    const store = await this.getStore()
    const expiresAt = ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null
    await store.sendNativeQuery(
      'INSERT OR REPLACE INTO _cache (key, value, expires_at) VALUES (?, ?, ?)',
      [key, JSON.stringify(value), expiresAt],
    )
  }

  /**
   * Checks if the cache store contains the specified key.
   * @param {string} key - The key to check.
   * @returns {Promise<boolean>} Promise resolving to true if the key exists, false otherwise.
   */
  async has(key) {
    await this.#ensureTable()
    const store = await this.getStore()
    const result = await store.sendNativeQuery(
      'SELECT expires_at FROM _cache WHERE key = ?',
      [key],
    )
    const row = result.rows[0]

    if (!row) return false

    if (row.expires_at && row.expires_at <= Date.now()) {
      await store.sendNativeQuery('DELETE FROM _cache WHERE key = ?', [key])
      return false
    }

    return true
  }

  /**
   * Deletes the key-value pair associated with the specified key from the cache store.
   * @param {string | string[]} key - The key or array of keys to delete.
   * @returns {Promise<number>} Promise resolving to the number of keys deleted.
   */
  async delete(key) {
    await this.#ensureTable()
    const store = await this.getStore()

    if (Array.isArray(key)) {
      let deletedCount = 0
      for (const k of key) {
        const result = await store.sendNativeQuery(
          'DELETE FROM _cache WHERE key = ?',
          [k],
        )
        deletedCount += result.changes || 0
      }
      return deletedCount
    }

    const result = await store.sendNativeQuery(
      'DELETE FROM _cache WHERE key = ?',
      [key],
    )
    return result.changes || 0
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
  async fetch(key, defaultValueOrCallback, ttlInSeconds) {
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
    }
    return cacheHit
  }

  /**
   * Adds a key-value pair to the cache store if the key does not already exist.
   * If the key already exists, the value is not updated.
   * @param {string} key - The key for the value.
   * @param {any} value - The value to store.
   * @param {number} [ttlInSeconds] - Optional. Time to live for the key-value pair in seconds.
   * @returns {Promise<boolean>} A promise that resolves to true if the key was added successfully, false if the key already exists.
   */
  async add(key, value, ttlInSeconds) {
    const exists = await this.has(key)
    if (!exists) {
      await this.set(key, value, ttlInSeconds)
      return true
    }
    return false
  }

  /**
   * Retrieves and removes the value associated with the specified key from the cache store.
   * If the key exists in the cache, returns the corresponding value and removes the key-value pair.
   * If the key does not exist, returns undefined.
   * @param {string} key - The key to retrieve and remove the value for.
   * @returns {Promise<any>} A promise that resolves to the value associated with the key, or undefined if the key does not exist in the cache.
   */
  async pull(key) {
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
  async forever(key, value) {
    await this.set(key, value)
  }

  /**
   * Destroys the cache store, removing all stored key-value pairs and stopping cleanup.
   * @returns {Promise<void>} A promise indicating completion of the operation.
   */
  async destroy() {
    await this.#ensureTable()
    const store = await this.getStore()
    await store.sendNativeQuery('DELETE FROM _cache')
    this.#stopCleanup()
  }
}

module.exports = SQLiteStore
