import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import json5 from 'json5';
import fs from 'fs';
import { gettripupdates } from './gtfs.js';
import Papa from 'papaparse';
// import * as token from "../tfnsw.token";

const app = express()
app.use(cors());
const port = 3000

// let p; // parameters to be loaded from json file

// Function to read and parse the JSON5 file
function parseJson5File(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return json5.parse(fileContent);
    } catch (error) {
      console.error('Error reading or parsing JSON5 file:', error);
      return null;
    }
}

// Function to read and parse the 
function parseCSVtoDict(filePath, key_string, value_string) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let out = Papa.parse(fileContent, {
            header: true,
            complete: function(results) {
                let out = {};
                results.data.forEach(function(row) {
                    var key = row[key_string];
                    var value = row[value_string];
                    out[key] = value;
                });
            return out;
            }
        });
        return out;
    } catch (error) {
        console.error('Error reading or parsing JSON5 file:', error);
        return null;
    }
}

let p = parseJson5File('params.json5');
let keys = parseJson5File('keys.json5');
// let routes = parseCSVtoDict('resources/routes.txt',"route_id","route_short_name");

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
})

app.get('/update/*', async (req, res) => {
    let locs = [];
    // const subpaths = req.params[0].split('/');
    // const mode = subpaths[-1];
    // const route = let joined = strings.slice(0, -1).join(", "); // Joins all but the last element'

    try {
        const res2 = await fetch(p.gtfs_url + req.params[0], {
          headers: {
            "Authorization": "apikey " + keys.tfnsw,
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