/* SondeHub ChaseCar lib
 * Uploads geolocation for chase cars to SondeHub
 *
 * Author: Rossen Gerogiev
 * Requires: jQuery
 * 
 * Updated to SondeHub v2 by Mark Jessop
 */

ChaseCar = {
    db_uri: "https://api.v2.sondehub.org/amateur/listeners",   // Sondehub API
};

// Updated SondeHub position upload function.
// Refer PUT listeners API here: https://generator.swagger.io/?url=https://raw.githubusercontent.com/projecthorus/sondehub-infra/main/swagger.yaml
// @callsign string
// @position object (geolocation position object)
ChaseCar.updatePosition = function(callsign, position) {
    if(!position || !position.coords) return;

    // Set altitude to zero if not provided.
    _position_alt = ((!!position.coords.altitude) ? position.coords.altitude : 0);

    var _doc = {
        "software_name": "SondeHub-Amateur",
        "software_version": document.body.dataset.version,
        "uploader_callsign": callsign,
        "uploader_position": [position.coords.latitude, position.coords.longitude, _position_alt],
        "uploader_antenna": "Mobile Station",
        "uploader_contact_email": "none@none.com",
        "mobile": true
    };

    // push the doc to sondehub
    $.ajax({
            type: "PUT",
            url: ChaseCar.db_uri,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(_doc),
    });
};
