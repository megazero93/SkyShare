<?php
$code = $_GET[CODE];

function redirect($url, $permanent = false) {
	if($permanent) {
		header('HTTP/1.1 301 Moved Permanently');
	}
	header('Location: '.$url);
	exit();
}

redirect('http://skyshare.azurewebsites.net/test.php', false);
?>