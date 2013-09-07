<?php
$code = $_GET[CODE];

function redirect($url, $permanent = false) {
	if($permanent) {
		header('HTTP/1.1 301 Moved Permanently');
	}
	header('Location: '.$url);
	exit();
}
$url2 = 'http://skyshare.azurewebsites.net/test.php/?code='.$code;
redirect('http://skyshare.azurewebsites.net/test.php', false);
exit();
?>