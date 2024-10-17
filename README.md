# SondeHub Amateur Tracker

A fork of [sondehub-tracker](https://github.com/projecthorus/sondehub-tracker) for use with the [SondeHub Amateur ElasticSearch](https://github.com/projecthorus/sondehub-infra/wiki/ElasticSearch-Kibana-access) database.

A webapp for tracking radiosondes. Works an desktop and mobile devices.
The SondeHub Amateur tracker is a continuation of [tracker.habhub.org](https://tracker.habhub.org/).

## Features

* Radiosonde Tracking using [SondeHub Amateur](https://github.com/projecthorus/sondehub-infra/wiki/ElasticSearch-Kibana-access) data. 
* Telemetry graph for each balloon
* Near realtime weather overlays
* Daylight cycle overlay, for long flights
* Map tracker with Leaflet API
* Run the app natively on IOS, Android, or desktop as a Progressive Wep App

### Geo position

The app will ask for permission to use your location.
This is required for some of the features. It is **important** to note that
your location will not be made available or send to anyone.

## Browser requirements

Any modern browser should be able to run the app. Some features are limited to Chromium based browsers.

## Contribute

Don't hesitate to report any issues, or suggest improvements. Just visit the [issues page](https://github.com/projecthorus/sondehub-amateur-tracker/issues).
Pull requests are welcome.

## Installation

    $ git clone https://github.com/projecthorus/sondehub-amateur-tracker.git
    $ ./build.sh
    $ python serve.py

Visit [http://localhost:8000](http://localhost:8000) to view the local version of the tracker!

## Original design

Author: Daniel Saul [@danielsaul](https://github.com/danielsaul)
