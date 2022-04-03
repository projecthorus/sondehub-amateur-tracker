/* SondeHub Tracker Format Incoming Data
 *
 * Author: Luke Prior
 */

function formatData(data) {
    var response = {};
    response.positions = {};
    var dataTemp = [];
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            if (typeof data[key] === 'object') {
                for (let i in data[key]) {
                    var dataTempEntry = {};
                    var stations;
                    if (data[key][i].software_name == "aprs") {
                        stations = data[key][i].uploader_callsign.split(",");
                    } else {
                        stations = [data[key][i].uploader_callsign];
                    }
                    dataTempEntry.callsign = {};
                    for (let x in stations) {
                        dataTempEntry.callsign[stations[x]] = {};
                    }
                    if (data[key][i].snr) {
                        dataTempEntry.callsign[stations[0]].snr = data[key][i].snr;
                    }
                    if (data[key][i].rssi) {
                        dataTempEntry.callsign[stations[0]].rssi = data[key][i].rssi;
                    }
                    if (data[key][i].frequency) {
                        dataTempEntry.callsign[stations[0]].frequency = data[key][i].frequency;
                    }
                    dataTempEntry.gps_alt = parseFloat((data[key][i].alt).toPrecision(8));
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
                    dataTempEntry.data = {};
                    if (data[key][i].batt) {
                        dataTempEntry.data.batt = Math.round(data[key][i].batt, 2);
                    }
                    if (data[key][i].frequency) {
                        dataTempEntry.data.frequency = Math.round(data[key][i].frequency, 3);
                    }
                    if (data[key][i].hasOwnProperty("humidity")) {
                        dataTempEntry.data.humidity = data[key][i].humidity;
                    }
                    if (data[key][i].hasOwnProperty("pressure")) {
                        dataTempEntry.data.pressure = data[key][i].pressure;
                    }
                    if (data[key][i].sats) {
                        dataTempEntry.data.sats = data[key][i].sats;
                    }
                    if (data[key][i].hasOwnProperty("temp")) {
                        dataTempEntry.data.temperature_external = data[key][i].temp;
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