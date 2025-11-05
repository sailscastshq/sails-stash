# Sails Stash

With Sails Stash, you can easily implement efficient caching for your Sails applications, enhancing performance and scalability without the need for complex setup.

Sails Stash integrates seamlessly with your Sails project, providing a straightforward way to cache data. It works out of the box with an in-memory store for development, and can be easily configured to use Redis for production environments. By leveraging caching, you can optimize the retrieval of frequently accessed data, reducing database load and improving overall application performance.

## Features

- Seamless integration with Sails projects
- **Zero-config memory store** for development (no Redis required!)
- Optional Redis support for production environments
- Improved performance and scalability
- Simple setup and usage

## Installation

You can install Sails Stash via npm:

```sh
npm i sails-stash
```

## Usage

Sails Stash works out of the box with **no configuration required**. It uses an in-memory store by default, perfect for development:

```js
// Works immediately after installation!
await sails.cache.fetch(
  'posts',
  async function () {
    return await Post.find()
  },
  6000,
)
```

## Using Redis for Production

When you're ready to deploy to production, you can optionally switch to Redis for persistent, distributed caching.

### 1. Install the Redis adapter

```sh
npm i sails-redis
```

### 2. Setup the datastore

```js
// config/datastores.js
module.exports.datastores = {
  // ... other datastores

  cache: {
    adapter: 'sails-redis',
    url: process.env.REDIS_URL,
  },
}
```

### 3. Configure Sails Stash to use Redis

```js
// config/local.js or config/env/production.js
module.exports = {
  cachestores: {
    default: {
      store: 'redis',
      datastore: 'cache',
    },
  },
}
```

That's it! Your application will now use Redis for caching in production while still using the memory store in development.

Check out the [documentation](https://docs.sailscasts.com/stash) for more ways to setup and use Sails Stash.

## Contributing

If you're interested in contributing to Sails Content, please read our [contributing guide](https://github.com/sailscastshq/sails-stash/blob/develop/.github/CONTRIBUTING.md).

## Sponsors

If you'd like to become a sponsor, check out [DominusKelvin](https://github.com/sponsors/DominusKelvin) sponsor page and tiers.
