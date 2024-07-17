import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
// import btoa from 'btoa';
import { gettripupdates } from './gtfs.js';
import Papa from 'papaparse';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import ftp from 'ftp';

// import { socket } from './ships.js';
import * as HELPERS from './helpers.js';
// import * as token from "../tfnsw.token";

import winston from "winston";
const logger = winston.createLogger({
  level: "info",
  // format: winston.format.json(),
  // Use timestamp and printf to create a standard log format
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "../logs/server.log" }),
  ],
});

logger.info('Server has rebooted.');

const app = express()
app.use(cors());
app.use('/resources', express.static('resources'))
app.use(express.json());

export let p = HELPERS.parseJson5File('params.json5');
export let keys = HELPERS.parseJson5File('keys.json5');
// let routes = parseCSVtoDict('resources/routes.txt',"route_id","route_short_name");

const debug = false;

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.listen(p.server.port, () => {
  logger.info(`Server listening on port ${p.server.port}`);
})

app.get('/update_gtfs/*', async (req, res) => {
  let locs = [];
  // const subpaths = req.params[0].split('/');
  // const mode = subpaths[-1];
  // const route = let joined = strings.slice(0, -1).join(", "); // Joins all but the last element'

  try {
    const res2 = await fetch(p.gtfs.url + req.params[0], {
      headers: {
        "Authorization": "apikey " + keys.tfnsw.token,
        // "Access-Control-Allow-Origin" : 'origin',
        // "accept": "application/x-google-protobuf"
      },
      //   mode: "no-cors"
    });
    if (!res2.ok) {
      const error = new Error(`${res2.url}: ${res2.status} ${res2.statusText}`);
      error.response = res2;
      throw error;
    }
    const buffer = await res2.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    // logger.info(feed)
    feed.entity.forEach((e) => {
      if (e.vehicle) {
        // let routeId = e.vehicle.trip.routeId.split('_')[0];
        // e['short_route_id'] = routes[routeId];
        // logger.info(e.vehicle.trip.routeId)
        // if ( e.vehicle.trip.routeId.includes('T3') ) {
        //     logger.info(e.vehicle.trip.routeId)
        // }

        locs.push(e);
      }
    });
    // send the data back to the client
    res.json(locs);
  }
  catch (error) {
    logger.info(error);
  }
});

app.get('/update_ships/', async (req, res) => {
  res.json(ships);
});

app.get('/update_flights/', async (req, res) => {
  let flights_path = p.flights.url + '/states/all?lamin=' + String(p.model.corners.sw.lat) + '&lomin=' + String(p.model.corners.sw.lng) + '&lamax=' + String(p.model.corners.ne.lat) + '&lomax=' + String(p.model.corners.ne.lng);
  // logger.info('FLIGHTS requesting: ' + ttt);
  const credentials = btoa(`${keys.opensky.username}:${keys.opensky.password}`);
  try {
    // Use fetch to get the data
    fetch(flights_path, {
      headers: new Headers({
        'Authorization': `Basic ${credentials}`
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();  // Parse the JSON of the response
      })
      .then(json => {
        // Here, you have your formatted JSON
        logger.info('Found flights: ' + JSON.stringify(json));
        res.json(json);
      })
      .catch(error => {
        logger.error('FLIGHTS: There has been a problem with your fetch operation:', error);
      });
    }
    catch (error) {
      logger.error('FLIGHTS: There has been a problem with your fetch operation:', error);
    res.status(500).json({ error: 'Internal Server Error' });  // Send an error response back to the client
    }
});

app.get('/update_radar/', (req, res) => {
  const client = new ftp();
  client.on('ready', function () {
    client.cwd('/anon/gen/radar/', function (err) {
      if (err) {
        logger.error('Error changing directory:', err);
        client.end();
        return;
      }

      client.list(function (err, list) {
        if (err) {
          logger.error('Error listing files:', err);
          client.end();
          return;
        }

        // Filter the list to include only images, assuming images have certain extensions
        const regex = new RegExp(`^${p.radar.ID}.*\\.png$`);
        const imageFiles = list.filter(file => file.name.match(regex));

        if (imageFiles.length === 0) {
          logger.error('No image files found.');
          client.end();
          return;
        }

        // Sort the files by modification time, most recent first
        imageFiles.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Get the most recent image file
        const mostRecentImage = imageFiles[0];

        if (debug) { logger.info(`Most recent image: ${mostRecentImage.name}`); }

        // Download the most recent image
        client.get(mostRecentImage.name, function (err, stream) {
          if (err) {
            logger.error('Error downloading the radar file:', err);
            client.end();
            return;
          }

          stream.once('close', function () { client.end(); });

          client.get('/anon/gen/radar/' + mostRecentImage.name, (err, stream) => {
            if (err) {
              logger.error(err);
              client.end();
              if (err.code === 550) { // FTP error code 550 indicates file not found or no access
                res.status(404).send('Image not found');
              } else {
                res.status(500).send('Internal server error');
              }
              return;
            } else {
              stream.once('close', () => client.end());

              // You can either save the image and then send it
              // Or directly pipe the stream to the response
              stream.pipe(res);
            }
          });
        });
      });
    });
  });

  client.connect({
    host: p.radar.url,
  });
  client.on('error', function (err) {
    logger.error('FTP connection error:', err);
  });
});

const socket = new WebSocket(p.ais.url);

socket.onopen = function (_) {
  let delta = 0.2;
  let subscriptionMessage = {
    Apikey: keys.ais.token,
    // BoundingBoxes: [[[p.map.center.lat - delta, p.map.center.lng - delta], [p.map.center.lat + delta, p.map.center.lng + delta]]],
    BoundingBoxes: [[[p.model.corners.ne.lat, p.model.corners.ne.lng], [p.model.corners.sw.lat, p.model.corners.sw.lng]]],
    FilterMessageTypes: ["PositionReport"] // Optional!
  }
  socket.send(JSON.stringify(subscriptionMessage));
};

let ships = {};

socket.onmessage = function (event) {
  let m = JSON.parse(event.data)
  // logger.info(m)
  let name = m.MetaData.ShipName.trim().replaceAll(' ', '&nbsp;').replaceAll('-', '&#8209;');
  // if ( m.Message.PositionReport.TrueHeading == 511) {
  //   m.Message.PositionReport.TrueHeading = 0; // data unaviailable
  // }
  let angle = m.Message.PositionReport.TrueHeading === 511 ? m.Message.Cog : m.Message.PositionReport.TrueHeading;

  ships[name] = {
    'lat': m.MetaData.latitude,
    'lon': m.MetaData.longitude,
    'updated': m.MetaData.time_utc,
    'angle': angle
  }
};

setInterval(function () {
  remove_old_ships(ships);
}, 1000);

function remove_old_ships(ships) {
  let now = Date.now();
  for (const [key, value] of Object.entries(ships)) {
    if (now - Date.parse(value.updated) > 10000) { // remove if older than 10 seconds
      delete ships[key];
    }
  }
}

app.get('/update_hazards/*', async (req, res) => {
  let locs = [];
  try {
    const res2 = await fetch(p.hazards.url + req.params[0], {
      headers: {
        "Authorization": "apikey " + keys.tfnsw.token,
      },
    });
    if (!res2.ok) {
      const error = new Error(`${res2.url}: ${res2.status} ${res2.statusText}`);
      error.response = res2;
      // throw error;
      logger.error(error);
    }
    // logger.info(locs);
    res.json(locs);
  }
  catch (error) {
    logger.info(error);
  }
});

// Handle errors using the logger
app.use((err, req, res, next) => {
  // Log the error message at the error level
  logger.error(err.message);
  res.status(500).send();
});

app.post('/log', (req, res) => {
  try {
    const { message } = req.body;
    logger.info('Message from front end: ' + message);
    res.json({ message: 'Message logged successfully' });
  } catch (error) {
    logger.error('Error logging message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});