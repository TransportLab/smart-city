# smart city
Augmented reality smart city installation. [See the live version here](https://transportlab.github.io/smart-city/?debug).

## Components
  1. 3D printed model of a city pulled from OSM
  2. three.js scene rendered in chrome sent to a projector
  3. live transport data

## Installation
  1. Download or clone this repository
  2. Install [Node.js](https://nodejs.org/en/)
  3. Install with `npm install`
  4. Install `webpack` with `npm install -g webpack` (may require `sudo`)
  5. Run `npm run start` to build the project and deploy to the browser
  6. Open Google Chrome (or possibly Firefox, but untested)
  7. In Chrome, go to the following URL: `http://localhost:8080/src/index.html`

## Usage
Many system parameters are controlled by URL flags, which can be used as, e.g.:

```
http://localhost:5000/src/index.html?debug
```

which will put the system in debug mode. These flags are currently undocumented and you need to hunt for them in the code. YMMV.