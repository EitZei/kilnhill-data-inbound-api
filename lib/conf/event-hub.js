const log = require('winston');
const { EventHubClient } = require("@azure/event-hubs");

const connectionString = process.env.EVENT_HUB_CONNECTION_STRING;
const eventHubsName = process.env.EVENT_HUB_NAME;

log.info(`Azure Event Hub connection: Start connecting`);
const client = EventHubClient.createFromConnectionString(connectionString, eventHubsName);
log.info(`Azure Event Hub connection: Connected`);

module.exports = client;
