# smart city
Augmented reality smart city installation.

## Components
  1. 3D printed model of a city pulled from OSM
  2. three.js scene rendered in chrome sent to a projector
  3. live transport data from Transport for NSW

## Installation
  1. Download or clone this repository
  2. Install [Node.js](https://nodejs.org/en/)
  3. Install with `npm install`
  4. Install `webpack` with `npm install -g webpack` (may require `sudo`)
  5. Go to https://opendata.transport.nsw.gov.au/ and create an account. After you have an account you can make an API key, with will be a long string. copy that string into an empty text file called `tfnsw.token` and place it into the`resources` folder.
  6. Run `npm run start` to build the project and deploy to the browser

## Usage
Many system parameters are controlled by URL flags, such as `debug` which can be used as:

```
http://localhost:8080/?debug
```

which will put the system in debug mode. These flags are currently undocumented and you need to hunt for them in the code. YMMV.
