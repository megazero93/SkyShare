<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
        "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Windows Live Test</title>
    <style>
        <!--
        .Name {
            font-family: 'Segoe UI', Verdana, Tahoma, Helvetica, Arial, sans-serif;
            font-weight: bold;
        }

        -->
    </style>
</head>
<body>
<h1>Windows Live Test</h1>

<div>
    <div id="meName" class="Name"></div>
    <div id="meImg"></div>
    <div id="signin"></div>
</div>
<script src="//js.live.net/v5.0/wl.js" type="text/javascript"></script>
<script type="text/javascript">

    // Update the following values
    var client_id = "0000000048103E6B",
        scope = ["wl.signin", "wl.basic", "wl.offline_access"],
        redirect_uri = "http://skyshare.azurewebsites.net/callback.php";

    function id(domId) {
        return document.getElementById(domId);
    }

    function displayMe() {
        var imgHolder = id("meImg"),
            nameHolder = id("meName"),
	    aut_token = "";

        if (imgHolder.innerHTML != "") return;

        if (WL.getSession() != null) {
	    var session = WL.getSession();
	    aut_token = session.authentication_token;
            WL.api({ path: "me/picture", method: "get" }).then(
                    function (response) {
                        if (response.location) {
                            imgHolder.innerHTML = "<img src='" + response.location + "' />";
                        }
                    }
                );

            WL.api({ path: "me", method: "get" }).then(
                    function (response) {
                        nameHolder.innerHTML = response.name;
                    }
                );
        }
    }

    function clearMe() {
        id("meImg").innerHTML = "";
        id("meName").innerHTML = "";
    }

    WL.Event.subscribe("auth.sessionChange",
        function (e) {
            if (e.session) {
                displayMe();
            }
            else {
                clearMe();
            }            
        }
    );

    WL.init({ client_id: client_id, redirect_uri: redirect_uri, response_type: "code", scope: scope });

    WL.ui({ name: "signin", element: "signin" });
</script>
</body>
</html>
