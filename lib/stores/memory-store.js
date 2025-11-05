const CacheStore = require('./cache-store')

function MemoryStore(sails) {
  CacheStore.call(this, sails)
  this.cache = new Map()
  this.cleanupInterval = null
  this._startCleanup()
}

MemoryStore.prototype = Object.create(CacheStore.prototype)
MemoryStore.prototype.constructor = MemoryStore

MemoryStore.prototype._startCleanup = function () {
  this.cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.cache.delete(key)
      }
    }
  }, 60000)

  if (this.cleanupInterval.unref) {
    this.cleanupInterval.unref()
  }
}

MemoryStore.prototype._stopCleanup = function () {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval)
    this.cleanupInterval = null
  }
}

MemoryStore.prototype.getStore = async function () {
  return this.cache
}

MemoryStore.prototype.get = async function (key, defaultValueOrCallback) {
  const entry = this.cache.get(key)

  if (!entry) {
    if (typeof defaultValueOrCallback === 'function') {
      return await defaultValueOrCallback()
    }
    return defaultValueOrCallback
  }

  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    this.cache.delete(key)
    if (typeof defaultValueOrCallback === 'function') {
      return await defaultValueOrCallback()
    }
    return defaultValueOrCallback
  }

  return entry.value
}

MemoryStore.prototype.set = async function (key, value, ttlInSeconds) {
  const entry = {
    value,
    expiresAt: ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null,
  }
  this.cache.set(key, entry)
}

MemoryStore.prototype.has = async function (key) {
  const entry = this.cache.get(key)

  if (!entry) {
    return false
  }

  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    this.cache.delete(key)
    return false
  }

  return true
}

MemoryStore.prototype.delete = async function (key) {
  if (Array.isArray(key)) {
    let deletedCount = 0
    for (const k of key) {
      if (this.cache.delete(k)) {
        deletedCount++
      }
    }
    return deletedCount
  }

  return this.cache.delete(key) ? 1 : 0
}

MemoryStore.prototype.fetch = async function (
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
  }
  return cacheHit
}

MemoryStore.prototype.add = async function (key, value, ttlInSeconds) {
  const exists = await this.has(key)
  if (!exists) {
    await this.set(key, value, ttlInSeconds)
    return true
  }
  return false
}

MemoryStore.prototype.pull = async function (key) {
  const value = await this.get(key)
  await this.delete(key)
  return value
}

MemoryStore.prototype.forever = async function (key, value) {
  await this.set(key, value)
}

MemoryStore.prototype.destroy = async function () {
  this.cache.clear()
  this._stopCleanup()
}

module.exports = MemoryStore
