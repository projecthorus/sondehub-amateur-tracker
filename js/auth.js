
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
        document.getElementById("login-prompt").innerHTML = "Logged in. <a onclick='logout()'>Click here to logout</a>"
    }
});

function logout(){
    logout_url = "https://auth.v2.sondehub.org/logout?client_id=21dpr4kth8lonk2rq803loh5oa&response_type=token&logout_uri=" + window.location.protocol + "//" + window.location.host
    sessionStorage.removeItem("id_token")
    window.location = logout_url
}

function do_a_thing(){



    // this is what we'll use to do the updates
    const lambda = new AWS.Lambda();
    const lambda_params = {
        FunctionName: 'test', /* required */
        Payload: JSON.stringify( { })
    };
    lambda.invoke(lambda_params,  function (err, data){
    if (err){
        document.getElementById("payload-update-results").textContent = err
    } else {
        document.getElementById("payload-update-results").textContent = JSON.stringify(data)
    } 
    })

}