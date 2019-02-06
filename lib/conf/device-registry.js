const log = require('winston');
const registry = {};

const deviceRegistryString = process.env.DEVICE_REGISTRY;

if (deviceRegistryString) {
  deviceRegistryString.split(',').forEach((pair) => {
    const [id, tenant, name] = pair.split('=');

    log.debug(`Registering device ID ${id} with name ${name}`);
    registry[id] = {
      name,
      tenant
    };
  });
}

module.exports = registry;
