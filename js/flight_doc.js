
// populate login url
document.getElementById("login_url").href= "https://auth.v2.sondehub.org/oauth2/authorize?client_id=21dpr4kth8lonk2rq803loh5oa&response_type=token&scope=email+openid+phone&redirect_uri=" + window.location.protocol + "//" + window.location.host

// manage AWS cognito auth
if (window.location.hash.indexOf("id_token") != -1){
    console.log("Detected login")
    var args = window.location.hash.slice(1)
    var parms = new URLSearchParams(args)
    var id_token = parms.get("id_token")
    sessionStorage.setItem("id_token", id_token)
}

// do AWS login
AWS.config.region = 'us-east-1';

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:55e43eac-9626-43e1-a7d2-bbc57f5f5aa9',
    Logins: {
        "cognito-idp.us-east-1.amazonaws.com/us-east-1_G4H7NMniM": sessionStorage.getItem("id_token")
    }
});

AWS.config.credentials.get(function(){
    // if this passes we update the login page to say logged in
    if (AWS.config.credentials.accessKeyId != undefined){
        document.getElementById("login_url").innerText = "Logout"
        document.getElementById("login_url").href="javascript:logout()"
        document.getElementById("update-flightdocs").style.display = "block"
        document.getElementById("prediction_settings_message").innerText = "Use this form to configure predictions for your launch. Please only use this for your own launches. Callsigns must match your payload callsigns exactly (case sensitive)."
    }
});
function query_flight_doc(){
    var payload_callsign = document.getElementById("flight_doc_payload_callsign").value
    fetch("https://api.v2.sondehub.org/amateur/flightdoc/"+payload_callsign).then(
        function(response){
            if (response.ok) {
                response.text().then(function(x) {
                    var data = JSON.parse(x)
                    if (data.float_expected) {
                        document.getElementById("flight_doc_float_expected").checked = true
                    } else {
                        document.getElementById("flight_doc_float_expected").checked = false
                    }
                    document.getElementById("flight_doc_peak_altitude").value = data.peak_altitude
                    document.getElementById("flight_doc_descent_rate").value = data.descent_rate
                    document.getElementById("flight_doc_ascent_rate").value = data.ascent_rate
                })
            } else {
                document.getElementById("payload-update-results").textContent = "Could not load payload data"
            }
        }
    )
}
function logout(){
    logout_url = "https://auth.v2.sondehub.org/logout?client_id=21dpr4kth8lonk2rq803loh5oa&response_type=token&logout_uri=" + window.location.protocol + "//" + window.location.host
    sessionStorage.removeItem("id_token")
    window.location = logout_url
}

function update_flight_doc(){

    var body = JSON.stringify(
        {
            "payload_callsign": document.getElementById("flight_doc_payload_callsign").value,
            "float_expected": document.getElementById("flight_doc_float_expected").checked == true,
            "peak_altitude": parseFloat(document.getElementById("flight_doc_peak_altitude").value),
            "descent_rate": parseFloat(document.getElementById("flight_doc_descent_rate").value),
            "ascent_rate": parseFloat(document.getElementById("flight_doc_ascent_rate").value),
        }
    )

    
    var httpRequest = new AWS.HttpRequest("https://api-raw.v2.sondehub.org/amateur/flightdoc" , "us-east-1");
    var v4signer = new AWS.Signers.V4(httpRequest, "execute-api", true);
    httpRequest.method = "PUT";
    httpRequest.headers['Host'] = 'api-raw.v2.sondehub.org';
    httpRequest.headers['Content-Type'] = 'application/json';
    httpRequest.headers['Content-Length'] = body.length;
    httpRequest.headers['X-Amz-Content-Sha256'] = v4signer.hexEncodedHash(body)
    httpRequest.body = body


    
    v4signer.addAuthorization(AWS.config.credentials, AWS.util.date.getDate());
    document.getElementById("payload-update-results").textContent = "Updating..."
    fetch(httpRequest.endpoint.href , {
        method: httpRequest.method,
        headers: httpRequest.headers,
        body: httpRequest.body,
    }).then(function (response) {
        if (!response.ok) {
            response.text().then(function(x) {document.getElementById("payload-update-results").textContent =x })
            return;
        }
        response.text().then(function(x) {document.getElementById("payload-update-results").textContent =x })
    });

}