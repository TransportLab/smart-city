import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

import { gettripupdates } from './gtfs.js';
import Papa from 'papaparse';
import WebSocket from 'ws';
import ftp from 'ftp';

// import { socket } from './ships.js';
import * as HELPERS from './helpers.js';
// import * as token from "../tfnsw.token";

const app = express()
app.use(cors());
app.use('/resources', express.static('resources'))

export let p = HELPERS.parseJson5File('params.json5');
export let keys = HELPERS.parseJson5File('keys.json5');
// let routes = parseCSVtoDict('resources/routes.txt',"route_id","route_short_name");

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(p.server.port, () => {
  console.log(`Server listening on port ${p.server.port}`);
})

app.get('/update/*', async (req, res) => {
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
        // console.log(feed)
        feed.entity.forEach((e) => {
          if (e.vehicle) {
            // let routeId = e.vehicle.trip.routeId.split('_')[0];
            // e['short_route_id'] = routes[routeId];
            // console.log(e.vehicle.trip.routeId)
            // if ( e.vehicle.trip.routeId.includes('T3') ) {
            //     console.log(e.vehicle.trip.routeId)
            // }

            locs.push(e);
          }
        });
        // send the data back to the client
        res.json(locs);
      }
      catch (error) {
        console.log(error);
      }
  });

app.get('/update_ships/', async (req, res) => {
  res.json(ships);
});

app.get('/update_flights/', async (req, res) => {
  // Use fetch to get the data
fetch(p.flights.url, {
  headers: new Headers({
    'Authorization': 'Basic ' + keys.flights.username + ':' + keys.flights.password  // Basic Authentication
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
  res.json(json);
})
.catch(error => {
  console.error('There has been a problem with your fetch operation:', error);
});
});

app.get('/update_radar/', (req, res) => {
  const client = new ftp();
  const now = new Date();
  now.setUTCMinutes(now.getUTCMinutes() - 2); // Subtract two minutes to give time for data to be available

  const formattedDateTime = HELPERS.formatDateTime(now);
  // console.log('anon/gen/radar/' + p.radar.ID + '.' + formattedDateTime + '.png')
  client.on('ready', () => {
    client.get('anon/gen/radar/' + p.radar.ID + '.' + formattedDateTime + '.png', (err, stream) => {
      if (err) {
        // console.warn(err);
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

  client.connect({
      host: p.radar.url,
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
    // console.log(m)
    let name = m.MetaData.ShipName.trim().replaceAll(' ', '&nbsp;').replaceAll('-', '&#8209;');
    // if ( m.Message.PositionReport.TrueHeading == 511) {
    //   m.Message.PositionReport.TrueHeading = 0; // data unaviailable
    // }
    let angle = m.Message.PositionReport.TrueHeading === 511 ? m.Message.Cog : m.Message.PositionReport.TrueHeading;

    ships[name] = {
     'lat' : m.MetaData.latitude,
      'lon' : m.MetaData.longitude,
      'updated' : m.MetaData.time_utc,
      'angle' : angle
    }
};

setInterval(function(){
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

