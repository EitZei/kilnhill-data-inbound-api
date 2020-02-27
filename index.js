require('./lib/conf/logging');

const log = require('winston');

const express = require('express');
const os = require('os');
const _ = require('lodash');

const deviceRegistry = require('./lib/conf/device-registry');
const influxProvider = require('./lib/conf/influxdb');
const eventHubProvider = require('./lib/conf/event-hub');

log.info('Starting up Data Inbound API...');

const measurementsName = 'ruuvitags';

const influx = influxProvider(measurementsName);
const eventHub = eventHubProvider;

const app = express();
app.use(express.json());

app.get('/api/latest/health', (req, res) => {
  influx.ping(5000).then((hosts) => {
    const status = (_.some(hosts, host => host.online)) ? 200 : 500;

    const hostsStatuses = hosts.map(host => ({
      online: host.online,
      host: host.url.host,
      rtt: host.rtt,
      version: host.version,
    }));

    res.status(status).json(hostsStatuses);
  }).catch((e) => {
    log.error(`Error getting InfuxDB status ${e}`);
    res.sendStatus(500);
  });
});

app.post('/api/latest/data', (req, res) => {
  const originalBody = req.body;

  const body = _.isArray(originalBody) ? originalBody : [originalBody];

  let invalidMeasurements = false;

  const measurements = body.map((dataItem) => {
    if (!dataItem.id || !dataItem.data) {
      invalidMeasurements = true;
    }

    // Tags
    const tags = {
      host: os.hostname(),
      id: dataItem.id,
    };

    const { tenant, name } = deviceRegistry[dataItem.id];

    if (_.isString(name)) {
      tags.tenant = tenant;
      tags.name = name;
    }

    // Measurement
    const measurement = {
      measurement: measurementsName,
      tags,
      fields: dataItem.data,
    };

    // Timestamp
    if (_.isFinite(dataItem.timestamp)) {
      measurement.timestamp = new Date(dataItem.timestamp);
    }

    return measurement;
  });

  if (invalidMeasurements) {
    log.warn('Unexpected message with measurements without ID or data');
    res.sendStatus(400);
    return;
  }


  influx.writePoints(measurements)
    .then(() => eventHub.send({ body: measurements }))
    .then(() => {
      log.debug(`Successfully wrote ${measurements.length} items to InfluxDB.`);
      res.sendStatus(202);
    }).catch((e) => {
      log.error(`Error in writing data to InfluxDB. ${e}`);
    });
});

const port = process.env.HTTP_PORT || 8888;
app.listen(port);

log.info(`Data Inbound API listening at port ${port}`);
