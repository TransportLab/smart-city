// from https://www.npmjs.com/package/gtfs-realtime-bindings
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import * as token from "../tfnsw.token";

let apikey = token[0][0];

export async function gettripupdates(p) {
  try {
    const res = await fetch(p.gtfs_url, {
      headers: {
        "Authorization": "apikey " + apikey,
      },
    //   mode: "cors"
    });
    if (!res.ok) {
      const error = new Error(`${res.url}: ${res.status} ${res.statusText}`);
      error.response = res;
      throw error;
    }
    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    feed.entity.forEach((entity) => {
      if (entity.tripUpdate) {
        console.log(entity.tripUpdate);
      }
    });
  }
  catch (error) {
    console.log(error);
  }
};