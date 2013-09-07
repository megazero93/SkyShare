<!DOCTYPE html>
<html lang="en">
<title>Code Page</title>
<body>
Hello
<?php
$code = $_POST["code"];
$code2 = $_SERVER['QUERY_STRING'];
echo "codes:";
echo $code;
echo "string:";
echo $code2;
?>

	</body>


</html>
