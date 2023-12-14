import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import json5 from 'json5';
import fs from 'fs';
import { gettripupdates } from './gtfs.js';

// import * as token from "../tfnsw.token";

const app = express()
app.use(cors());
const port = 3000

// let p; // parameters to be loaded from json file

// Function to read and parse the JSON5 file
function readJson5File(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return json5.parse(fileContent);
    } catch (error) {
      console.error('Error reading or parsing JSON5 file:', error);
      return null;
    }
  }

const p = readJson5File('params.json5');
const keys = readJson5File('keys.json5');

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
})

app.get('/update_bus', async (req, res) => {
    let locs = [];
    try {
        const res2 = await fetch(p.gtfs_url, {
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
        feed.entity.forEach((entity) => {
          if (entity.vehicle) {
            // console.log(entity)
            locs.push(entity.vehicle);
          }
        });
        // send the data back to the client
        res.json(locs);
      }
      catch (error) {
        console.log(error);
      }
  });