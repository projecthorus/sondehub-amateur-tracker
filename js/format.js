/* SondeHub Tracker Format Incoming Data
 *
 * Author: Luke Prior
 */

function formatData(data) {
    var hideAprs = offline.get('opt_hide_aprs');
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
                    if (vehicles.hasOwnProperty(data[key][i].payload_callsign)) {
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
                        if (data[key][i].software_name == "aprs") {
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
                    if (dataTempEntry.gps_alt < 1500 && aprsflag && !hideAprs) {
                        continue;
                    }
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

                    // Cleanup of some fields, limiting precision, formatting. etc.
                    // Currently this section copies over specific fields. It should be changed
                    // to initially copy over all fields that have not already been included,
                    // Then apply formatting to some 'known' fields.

                    // Fairly common fields
                    if (data[key][i].hasOwnProperty("batt")) {
                        dataTempEntry.data.batt = +data[key][i].batt.toFixed(2);
                    }
                    if (data[key][i].hasOwnProperty("frequency")) {
                        dataTempEntry.data.frequency = +data[key][i].frequency.toFixed(4);
                    }
                    if (data[key][i].hasOwnProperty("tx_frequency")) {
                        dataTempEntry.data.frequency_tx = +data[key][i].tx_frequency.toFixed(3);
                    }
                    if (data[key][i].hasOwnProperty("humidity")) {
                        dataTempEntry.data.humidity = data[key][i].humidity;
                    }
                    if (data[key][i].hasOwnProperty("pressure")) {
                        dataTempEntry.data.pressure = data[key][i].pressure;
                    }
                    if (data[key][i].hasOwnProperty("sats")) {
                        dataTempEntry.data.sats = data[key][i].sats;
                    }
                    if (data[key][i].hasOwnProperty("temp")) {
                        dataTempEntry.data.temp = data[key][i].temp;
                    }
                    if (data[key][i].hasOwnProperty("comment")) {
                        dataTempEntry.data.comment = data[key][i].comment;
                    }

                    // Horus Binary V2 Fields
                    if (data[key][i].hasOwnProperty("ascent_rate")) {
                        // Limit to 1 decimal place.
                        dataTempEntry.data.ascent_rate = +data[key][i].ascent_rate.toFixed(1);
                    }
                    if (data[key][i].hasOwnProperty("ext_pressure")) {
                        dataTempEntry.data.ext_pressure = data[key][i].ext_pressure;
                    }
                    if (data[key][i].hasOwnProperty("ext_humidity")) {
                        dataTempEntry.data.ext_humidity = data[key][i].ext_humidity;
                    }
                    if (data[key][i].hasOwnProperty("ext_temperature")) {
                        dataTempEntry.data.ext_temperature = data[key][i].ext_temperature;
                    }

                    // Horus LoRa Fields
                    if (data[key][i].hasOwnProperty("pyro_voltage")) {
                        dataTempEntry.data.pyro_voltage = +data[key][i].pyro_voltage.toFixed(2);
                    }
                    if (data[key][i].hasOwnProperty("noise_floor_dbm")) {
                        dataTempEntry.data.noise_floor_dbm = data[key][i].noise_floor_dbm;
                    }
                    if (data[key][i].hasOwnProperty("rx_pkt_count")) {
                        dataTempEntry.data.rx_pkt_count = data[key][i].rx_pkt_count;
                    }

                    // Metadata added on by receiver applications.
                    if (data[key][i].hasOwnProperty("modulation")) {
                        dataTempEntry.data.modulation = data[key][i].modulation;
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