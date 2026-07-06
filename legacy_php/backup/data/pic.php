<?php
// 本地图片防盗链中转代理
$url = isset($_GET['url']) ? $_GET['url'] : '';
if (empty($url)) {
    header("HTTP/1.1 404 Not Found");
    die();
}

$parsed_url = parse_url($url);
$target_host = isset($parsed_url['host']) ? $parsed_url['host'] : '';

$allowed_hosts = array('doubanio.com', 'douban.com', 'img.liangzipic.com', 'img.doubanio.com');
$is_allowed = false;
foreach ($allowed_hosts as $ah) {
    if ($target_host === $ah || substr($target_host, -strlen('.' . $ah)) === '.' . $ah) {
        $is_allowed = true;
        break;
    }
}
if (!$is_allowed) {
    header("HTTP/1.1 403 Forbidden");
    die();
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

// 关键：针对性伪造 Referer 和 User-Agent，绕过防盗链
if (strpos($target_host, 'doubanio.com') !== false || strpos($target_host, 'douban.com') !== false) {
    curl_setopt($ch, CURLOPT_REFERER, 'https://movie.douban.com/');
} else {
    curl_setopt($ch, CURLOPT_REFERER, 'https://' . $target_host . '/');
}
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

curl_close($ch);

if ($http_code === 200 && !empty($response)) {
    if (!empty($content_type)) {
        $content_type = preg_replace('/[\r\n]/', '', $content_type);
        header("Content-Type: " . $content_type);
    } else {
        header("Content-Type: image/webp");
    }
    // 允许浏览器在本地强缓存 30 天，避免频繁向我们服务器发起图片中转请求
    header("Cache-Control: public, max-age=2592000");
    echo $response;
} else {
    header("HTTP/1.1 404 Not Found");
}
