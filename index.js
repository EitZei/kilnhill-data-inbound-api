require('./lib/conf/logging');

const log = require('winston');
const Influx = require('influx');
const express = require('express');
const os = require('os');
const _ = require('lodash');

log.info('Starting up Data Inbound API...');

const measurementsName = 'ruuvitags';

const influx = new Influx.InfluxDB({
  host: process.env.INFLUXDB_HOST,
  database: process.env.INFLUXDB_DATABASE,
  username: process.env.INFLUXDB_USERNAME,
  password: process.env.INFLUXDB_PASSWORD,
  schema: [{
    measurement: measurementsName,
    fields: {
      humidity: Influx.FieldType.FLOAT,
      temperature: Influx.FieldType.FLOAT,
      pressure: Influx.FieldType.INTEGER,
      accelerationX: Influx.FieldType.INTEGER,
      accelerationY: Influx.FieldType.INTEGER,
      accelerationZ: Influx.FieldType.INTEGER,
      battery: Influx.FieldType.INTEGER,
    },
    tags: [
      'host', 'id',
    ],
  }],
});


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
  const {
    body,
  } = req;

  if (!body.id || !body.data) {
    log.warn('Unexpected message without ID or data');
    res.sendStatus(400);
    return;
  }

  influx.writePoints([{
    measurement: 'ruuvitags',
    tags: {
      host: os.hostname(),
      id: body.id,
    },
    fields: body.data,
  }]).then(() => {
    log.debug(`Successfully wrote to InfluxDB from ID ${body.id}`);
    res.sendStatus(202);
  }).catch((e) => {
    log.error(`Error in writing data to InfluxDB from ID ${body.id}. ${e}`);
  });
});

const port = process.env.HTTP_PORT || 8888;
app.listen(port);

log.info(`Data Inbound API listening at port ${port}`);
