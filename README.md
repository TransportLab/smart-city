# smart city
Augmented reality smart city installation.

## Competition
[For information on the competition and how to submit, see here](https://github.com/TransportLab/smart-city/blob/main/COMPETITION.md)

## Components
  1. 3D model of a city
  2. three.js scene rendered in chrome sent to a projector
  3. live data to display

## Hardware
This installation requires the following:
  1. A small PC or single board computer. We used the [Okdo ROCK 5 B](https://www.okdo.com/p/okdo-rock-5-model-b-8gb-single-board-computer-rockchip-rk3588-arm-cortex-a76-cortex-a55/). We also purchased a M.2 Wireless module and a heatsink and fan.
  2. A projector. We used the [Sony VPLPHZ51](https://pro.sony/ue_US/products/laser-projectors/vpl-phz51).
  3. Housing for the SBC and projector so they can be mounted on a wall and not stolen. We used an [Integra H181608HLL](https://www.integraenclosures.com/).

Assemble the equipment, cut a hole in the housing for the projector to project through, and a few holes for ventilation near the fans.

For the 3D model, we used a CNC machine to cut rigid extruded polystyrene sheets. These were then coated in a few layers of watered down PVA glue to seal it, and then spray painted white.

Code to generate the 3D model is contained in `src/python/`. Set the bounding box and physical dimensions you're interested in in `params.json5`, then you can run `get_elevation.py` to pull high resolution elevation data from our web server. You can then run `make_stl.py` to convert that elevation data to a mesh that can be CNC machined. Alternatively you can use [another service such as this](https://jthatch.com/Terrain2STL/).

## Software
  1. Download or clone this repository into `/opt/smart-city/`
  2. Install [Node.js](https://nodejs.org/en/)
  3. Install the required dependencies with `npm install`
  4. Install `webpack` with `npm install -g webpack` (may require `sudo`)
  5. For the data sources, you need to get your own keys to access them. For the data sources that are set up by default, you should:
    1. Rename `keys_template.json5` to `keys.json5`.
    2. Go to `https://opendata.transport.nsw.gov.au/` and create an account. After you have an account you can make an API key, with will be a long string. Copy that string into the placeholder in `keys.json5`.
    3. Register another account with `https://opensky-network.org/` to get flight data and copy the API key across.
    4. Register another account with `https://aisstream.io/` to get marine data and copy the API key across.
  7. Open a terminal and navigate to the project directory. Run `npm start` to start the server and open a browser window with the projector interface.
  8. To set things up permanently, each of the `.service` files in the `sys` subfolder need to be copied across to `/etc/systemd/system/` and then enabled and started with `systemctl enable <service-name>`. The git pull service doesnt need to be enabled, just the timer.
  9. We also need to set up the BIOS to restart the computer when it loses power. This is done by going into the BIOS (keep pushing F2 after restart) and setting the power loss option to restart.
  10. If you want remote access, consider installing RustDesk or equivalent.

## Usage
Many system parameters are controlled by URL flags, such as `debug` which can be used as:

```
http://localhost:8080/?debug
```

which will put the system in debug mode. These flags are currently undocumented and you need to hunt for them in the code. YMMV.
