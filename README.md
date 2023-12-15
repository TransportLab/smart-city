# smart city
Augmented reality smart city installation.

## Components
  1. 3D model of a city
  2. three.js scene rendered in chrome sent to a projector
  3. live data to display

## Installation
  1. Download or clone this repository
  2. Install [Node.js](https://nodejs.org/en/)
  3. Install with `npm install`
  4. Install `webpack` with `npm install -g webpack` (may require `sudo`)
  5. Go to https://opendata.transport.nsw.gov.au/ and create an account. After you have an account you can make an API key, with will be a long string. copy that string into the placeholder in `keys_template.json5` and rename the file to `keys.json5`.
  6. Open a terminal and navigate to the project directory. Run `npm start` to start the server and open a browser window with the projector interface.

## Usage
Many system parameters are controlled by URL flags, such as `debug` which can be used as:

```
http://localhost:8080/?debug
```

which will put the system in debug mode. These flags are currently undocumented and you need to hunt for them in the code. YMMV.
