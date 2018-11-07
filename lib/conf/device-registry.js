const log = require('winston');
const registry = {};

const deviceRegistryString = process.env.DEVICE_REGISTRY;

if (deviceRegistryString) {
  deviceRegistryString.split(',').forEach((pair) => {
    const [id, name] = pair.split('=');

    log.debug(`Registering device ID ${id} with name ${name}`);
    registry[id] = name;
  });
}

module.exports = registry;
