<?php
// Allow all origins — adjust as needed
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/xml");

// Get RSS feed from feed query string
$rssUrl = $_GET['feed'];

$allowedUrls = [
    "https://25livepub.collegenet.com/calendars/clark-events.rss",
    "https://25livepub.collegenet.com/calendars/training-and-development.rss"
];

if (!in_array($rssUrl, $allowedUrls)) {
    die();
}

// Use cURL to fetch the RSS feed
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $rssUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'PHP RSS Proxy');
$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo "Error: " . curl_error($ch);
} else {
    echo $response;
}

curl_close($ch);
?>