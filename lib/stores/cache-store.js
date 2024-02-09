function CacheStore(sails) {
  if (new.target === CacheStore) {
    throw new Error('CacheStore is an abstract class and cannot be instantiated directly');
  }

  this.sails = sails;
  this.datastore = sails.config.stash.stores[sails.config.stash.store].datastore
  this.store = null;
}
/**
 * Retrieves the cache store instance.
 * @returns {Promise<any>} A promise that resolves to the cache store instance.
 */
CacheStore.prototype.getStore = async function () {
  if (!this.store) {
    this.store = await this.sails.getDatastore(this.datastore);
  }
  return this.store;
};

module.exports = CacheStore;
