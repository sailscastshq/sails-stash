# Sails Stash

With Sails Stash, you can easily implement efficient caching for your Sails applications, enhancing performance and scalability without the need for complex setup.

Sails Stash integrates seamlessly with your Sails project, providing a straightforward way to cache data using Redis. By leveraging Redis as a caching layer, you can optimize the retrieval of frequently accessed data, reducing database load and improving overall application performance.

## Features

- Seamless integration with Sails projects
- Efficient caching using Redis
- Improved performance and scalability
- Simple setup and usage

## Installation

You can install Sails Stash via npm:

```sh
npm i sails-stash
```

## Using Redis as store

To use Redis as a cache store, install the `sails-redis` adapter

```sh
npm i sails-redis
```

### Setup the datastore

```js
// config/datastores.js
...
cache: {
  adapter: 'sails-redis'
  url: '<REDIS_URL>'
}
```

## Usage

You can now cache values in your Sails actions.

```js
await sails.cache.fetch(
  'posts',
  async function () {
    return await Post.find()
  },
  6000,
)
```

Check out the [documentation](https://docs.sailscasts.com/stash) for more ways to setup and use Sails Stash.

## Contributing

If you're interested in contributing to Sails Content, please read our [contributing guide](https://github.com/sailscastshq/sails-stash/blob/develop/.github/CONTRIBUTING.md).

## Sponsors

If you'd like to become a sponsor, check out [DominusKelvin](https://github.com/sponsors/DominusKelvin) sponsor page and tiers.
