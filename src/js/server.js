import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { gettripupdates } from './gtfs.js';
import Papa from 'papaparse';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import ftp from 'ftp';
import * as HELPERS from './helpers.js';
import winston from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';

const app = express();

app.use(cors());
app.use('/resources', express.static('resources'));
app.use(express.json());

// Parse configuration files
export let p = HELPERS.parseJson5File('params.json5');
export let keys = HELPERS.parseJson5File('keys.json5');

// Set up logging with rotation and structured logging
const transport = new DailyRotateFile({
  filename: '../logs/server-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
});

// Make logging level configurable via environment variable
// const logLevel = process.env.LOG_LEVEL || 'info';
const logLevel = process.env.LOG_LEVEL || 'debug';

// How to Use the Configurable Logging Level:
// Default Behavior:

// If you don't set the LOG_LEVEL environment variable, the logging level defaults to 'info'.
// This means only logs at 'info', 'warn', and 'error' levels will be recorded.
// Setting the Logging Level:
//   export LOG_LEVEL=warn
//   node server.js
// Replace 'warn' with your desired logging level ('debug', 'info', 'warn', 'error').

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() // Structured logging in JSON format
  ),
  transports: [
    new winston.transports.Console(),
    transport,
  ],
});

logger.info('Server has rebooted.');

// Global error handlers for unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
});

// Middleware to log incoming requests at debug level
app.use((req, res, next) => {
  const { method, url, headers, query } = req;
  const safeHeaders = { ...headers };
  delete safeHeaders['authorization']; // Remove sensitive headers
  logger.debug('Incoming request', { method, url, headers: safeHeaders, query });
  next();
});

// Start server
app.listen(p.server.port, () => {
  logger.info(`Server listening on port ${p.server.port}`);
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Helper function for fetch with timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Implement /update_gtfs/* route
app.get('/update_gtfs/*', async (req, res) => {
  let mode = req.params[0];
  logger.debug('Server has been asked to update GTFS with mode ' + mode);
  let locs = [];

  try {
    const url = p.gtfs.url + req.params[0];
    const res2 = await fetchWithTimeout(url, {
      headers: {
        "Authorization": "apikey " + keys.tfnsw.token,
      },
      timeout: 5000,
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
    feed.entity.forEach((e) => {
      if (e.vehicle) {
        locs.push(e);
      }
    });

    res.json(locs);
  } catch (error) {
    logger.error('Error in /update_gtfs/*:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/update_gtfs2/*', async (req, res) => {
  let locs = [];

  try {
    const res2 = await fetch(p.gtfs2.url + req.params[0], {
      headers: {
        "Authorization": "apikey " + keys.tfnsw.token,
      },
      timeout: 5000,
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
    feed.entity.forEach((e) => {
      if (e.vehicle) {
        locs.push(e);
      }
    });

    res.json(locs);
  } catch (error) {
    logger.error('Error in /update_gtfs/*:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/update_gtfs2/*', async (req, res) => {
  let locs = [];
  // const subpaths = req.params[0].split('/');
  // const mode = subpaths[-1];
  // const route = let joined = strings.slice(0, -1).join(", "); // Joins all but the last element'

  try {
    const res2 = await fetch(p.gtfs2.url + req.params[0], {
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

// Initialize ships object
let ships = {};

// Implement /update_ships/ route
app.get('/update_ships/', async (req, res) => {
  try {
    if (Object.keys(ships).length === 0) {
      return res.json(null);
    }
    res.json(ships);
  } catch (error) {
    logger.error('Error in /update_ships/ route:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Implement /update_flights/ route
app.get('/update_flights/', async (req, res) => {
  const swLat = p.model.corners.sw.lat;
  const swLng = p.model.corners.sw.lng;
  const neLat = p.model.corners.ne.lat;
  const neLng = p.model.corners.ne.lng;
  const flightsPath = `${p.flights.url}/states/all?lamin=${swLat}&lomin=${swLng}&lamax=${neLat}&lomax=${neLng}`;
  const credentials = Buffer.from(`${keys.opensky.username}:${keys.opensky.password}`).toString('base64');

  try {
    const response = await fetchWithTimeout(flightsPath, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const json = await response.json();
    logger.debug('Found flights', { data: json });
    res.json(json);
  } catch (error) {
    logger.error('FLIGHTS: There has been a problem with your fetch operation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Implement /update_radar/ route
app.get('/update_radar/', (req, res) => {
  const client = new ftp();

  client.on('ready', function () {
    client.cwd('/anon/gen/radar/', function (err) {
      if (err) {
        logger.error('Error changing directory:', err);
        client.end();
        res.status(500).send('Internal server error');
        return;
      }

      client.list(function (err, list) {
        if (err) {
          logger.error('Error listing files:', err);
          client.end();
          res.status(500).send('Internal server error');
          return;
        }

        const regex = new RegExp(`^${p.radar.ID}.*\\.png$`);
        const imageFiles = list.filter(file => file.name.match(regex));

        if (imageFiles.length === 0) {
          logger.warn('No image files found.');
          client.end();
          res.status(404).send('Image not found');
          return;
        }

        imageFiles.sort((a, b) => new Date(b.date) - new Date(a.date));
        const mostRecentImage = imageFiles[0];
        logger.debug('Most recent radar image', { imageName: mostRecentImage.name });

        client.get(mostRecentImage.name, function (err, stream) {
          if (err) {
            logger.error('Error downloading the radar file:', err);
            client.end();
            res.status(500).send('Internal server error');
            return;
          }

          stream.once('close', function () { client.end(); });
          stream.pipe(res);
        });
      });
    });
  });

  client.on('error', function (err) {
    logger.error('FTP connection error:', err);
    res.status(500).send('Internal server error');
  });

  client.connect({
    host: p.radar.url,
  });
});

// Implement /update_hazards/* route
app.get('/update_hazards/*', async (req, res) => {
  try {
    const url = p.hazards.url + req.params[0];
    const res2 = await fetchWithTimeout(url, {
      headers: {
        "Authorization": "apikey " + keys.tfnsw.token,
      },
      timeout: 5000,
    });

    if (!res2.ok) {
      const error = new Error(`${res2.url}: ${res2.status} ${res2.statusText}`);
      error.response = res2;
      throw error;
    }

    const data = await res2.json();
    res.json(data);
  } catch (error) {
    logger.error('Error in /update_hazards/*:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Implement WebSocket for ships
const socket = new WebSocket(p.ais.url);

socket.onopen = function () {
  let subscriptionMessage = {
    Apikey: keys.ais.token,
    BoundingBoxes: [[[p.model.corners.ne.lat, p.model.corners.ne.lng], [p.model.corners.sw.lat, p.model.corners.sw.lng]]],
    FilterMessageTypes: ["PositionReport"],
  };
  socket.send(JSON.stringify(subscriptionMessage));
  logger.info('WebSocket connection opened and subscription message sent.');
};

socket.onmessage = function (event) {
  try {
    let m = JSON.parse(event.data);
    let name = m.MetaData.ShipName.trim().replace(/ /g, '&nbsp;').replace(/-/g, '&#8209;');
    let angle = m.Message.PositionReport.TrueHeading === 511 ? m.Message.Cog : m.Message.PositionReport.TrueHeading;

    ships[name] = {
      'lat': m.MetaData.latitude,
      'lon': m.MetaData.longitude,
      'updated': m.MetaData.time_utc,
      'angle': angle,
    };
    // Log at debug level
    // logger.debug('Received ship position update', { shipName: name, position: ships[name] });
  } catch (error) {
    logger.error('Error processing WebSocket message:', error);
  }
};

socket.onerror = function (error) {
  logger.error('WebSocket error:', error);
};

socket.onclose = function (code, reason) {
  logger.warn('WebSocket closed', { code, reason });
  // Optionally attempt to reconnect
};

// Function to remove old ships
function removeOldShips(ships) {
  let now = Date.now();
  for (const [key, value] of Object.entries(ships)) {
    if (now - Date.parse(value.updated) > 10000) {
      delete ships[key];
      logger.debug('Removed old ship from tracking', { shipName: key });
    }
  }
}

// Periodically clean up old ships
setInterval(function () {
  removeOldShips(ships);
}, 1000);

app.use((err, req, res, next) => {
  logger.error('Express error handler:', { error: err, stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

app.post('/log', (req, res) => {
  try {
    const { message, level } = req.body;
    const validLevels = ['debug', 'info', 'warn', 'error'];

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Invalid message' });
      return;
    }

    // Validate the log level
    let logLevel = 'info'; // Default to 'info'
    if (level && validLevels.includes(level)) {
      logLevel = level;
    } else if (level) {
      res.status(400).json({ error: 'Invalid log level' });
      return;
    }

    // Log the message using the specified level
    logger[logLevel]('Message from front end', { message });

    res.json({ message: 'Message logged successfully' });
  } catch (error) {
    logger.error('Error logging message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default app;
