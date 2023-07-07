/* SondeHub Amateur Tracker Format Incoming Data
 *
 * Author: Luke Prior
 */

var excludedFields = [
    "payload_callsign", 
    "uploader_callsign", 
    "software_version", 
    "position", 
    "user-agent", 
    "uploaders", 
    "snr", 
    "rssi", 
    "software_name", 
    "alt", 
    "lat", 
    "lon", 
    "heading", 
    "datetime", 
    "payload_callsign", 
    "path", 
    "time_received",
    "frame",
    "uploader_alt",
    "uploader_position",
    "uploader_radio",
    "uploader_antenna",
    "raw",
    "aprs_tocall",
    "telemetry_hidden"
];

var uniqueKeys = {
    "batt": {"precision": 2},
    "frequency": {"precision": 4},
    "tx_frequency": {"precision": 4}
}

function formatData(data) {
    var showAprs = offline.get('opt_show_aprs');
    var showTesting = offline.get("opt_show_testing");
    var response = {};
    response.positions = {};
    var dataTemp = [];
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if (typeof data[key] === 'object') {
                for (let i in data[key]) {
                    var dataTempEntry = {};
                    var aprsflag = false;
                    dataTempEntry.callsign = {};
                    maximumAltitude = 0;
                    if (vehicles.hasOwnProperty(data[key][i].payload_callsign)) {
                        maximumAltitude = vehicles[data[key][i].payload_callsign].max_alt;
                        if (data[key][i].datetime == vehicles[data[key][i].payload_callsign].curr_position.gps_time) {
                            dataTempEntry = vehicles[data[key][i].payload_callsign].curr_position;
                        }
                    }
                    if (!data[key][i].hasOwnProperty("uploaders")) {
                        data[key][i].uploaders = [];
                        data[key][i].uploaders[0] = {}
                        data[key][i].uploaders[0].uploader_callsign = data[key][i].uploader_callsign;
                        if (data[key][i].snr) {
                            data[key][i].uploaders[0].snr = + data[key][i].snr.toFixed(1);
                        }
                        if (data[key][i].rssi) {
                            data[key][i].uploaders[0].rssi = + data[key][i].rssi.toFixed(1);
                        }
                        if (data[key][i].frequency) {
                            data[key][i].uploaders[0].frequency = + data[key][i].frequency.toFixed(4);
                        } 
                    }
                    for (let entry in data[key][i].uploaders) {
                        // This check should probably be done using a modulation field, but this still works I guess..
                        if (data[key][i].software_name.includes("APRS")) {
                            aprsflag = true;
                            var stations = data[key][i].uploaders[entry].uploader_callsign.split(",");
                            for (let uploader in stations) {
                                dataTempEntry.callsign[stations[uploader]] = {};
                            }
                        } else {
                            uploader_callsign = data[key][i].uploaders[entry].uploader_callsign
                            dataTempEntry.callsign[uploader_callsign] = {};
    
                            if (data[key][i].uploaders[entry].snr) {
                                dataTempEntry.callsign[uploader_callsign].snr = + data[key][i].uploaders[entry].snr.toFixed(1);
                            }
                            if (data[key][i].uploaders[entry].rssi) {
                                dataTempEntry.callsign[uploader_callsign].rssi = + data[key][i].uploaders[entry].rssi.toFixed(1);
                            }
                            if (data[key][i].uploaders[entry].frequency) {
                                dataTempEntry.callsign[uploader_callsign].frequency = + data[key][i].uploaders[entry].frequency.toFixed(4);
                            }  
    
                        }
                    }
                    dataTempEntry.gps_alt = parseFloat((data[key][i].alt).toPrecision(8));
                    if (dataTempEntry.gps_alt > maximumAltitude) {
                        maximumAltitude = dataTempEntry.gps_alt;
                    }
                    // APRS Altitude filter.
                    if (maximumAltitude < 1500 && aprsflag && !showAprs) {
                        continue;
                    }
                    // Testing payload filter.
                    if (data[key][i].telemetry_hidden && !showTesting){
                        continue;
                    }
                    //
                    dataTempEntry.gps_lat = parseFloat((data[key][i].lat).toPrecision(8));
                    dataTempEntry.gps_lon = parseFloat((data[key][i].lon).toPrecision(8));
                    if (dataTempEntry.gps_lat == 0 && dataTempEntry.gps_lon == 0) {
                        continue;
                    }
                    if (data[key][i].heading) {
                        dataTempEntry.gps_heading = data[key][i].heading;
                    }
                    dataTempEntry.gps_time = data[key][i].datetime;
                    dataTempEntry.server_time = data[key][i].datetime;
                    dataTempEntry.vehicle = data[key][i].payload_callsign;
                    dataTempEntry.position_id = data[key][i].payload_callsign + "-" + data[key][i].datetime;
                    if (!dataTempEntry.hasOwnProperty("data")) {
                        dataTempEntry.data = {};
                    }

                    // Automatically add all remaining fields as data excluding excluded fields

                    for (let field in data[key][i]) {
                        if (excludedFields.includes(field)) {
                            continue;
                        }
                        if (uniqueKeys.hasOwnProperty(field)) {
                            dataTempEntry.data[field] = data[key][i][field].toFixed(uniqueKeys[field].precision);
                        } else {
                            dataTempEntry.data[field] = data[key][i][field];
                        }
                    }

                    dataTemp.push(dataTempEntry);
                }
            }
        }
    }
    response.positions.position = dataTemp;
    response.fetch_timestamp = Date.now();
    return response;
}