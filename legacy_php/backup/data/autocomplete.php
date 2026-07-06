<?php
/**
 * 智能搜索联想接口 - 支持并发多源检索与唯一ID前缀
 */
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/index.php';

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
if (empty($q)) {
    echo json_encode([]);
    exit;
}

// 缓存键值设置
$cache_key = 'autocomplete_' . md5($q);
$cached = data_cache_get($cache_key, false);
if ($cached !== false) {
    echo json_encode($cached);
    exit;
}

global $cms_api_list;
$chs = array();
$mh = curl_multi_init();
$encoded_q = urlencode($q);

// 并发向所有源请求 ac=list 联想列表，超时时间限制在 2 秒以确保实时交互性能
foreach ($cms_api_list as $idx => $api_url) {
    $url = $api_url . '?ac=list&wd=' . $encoded_q . '&pg=1';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2); // 2秒超时
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ));
    
    curl_multi_add_handle($mh, $ch);
    $chs[$idx] = $ch;
}

$active = null;
do {
    $mrc = curl_multi_exec($mh, $active);
} while ($mrc == CURLM_CALL_MULTI_PERFORM);

while ($active && $mrc == CURLM_OK) {
    if (curl_multi_select($mh) != -1) {
        do {
            $mrc = curl_multi_exec($mh, $active);
        } while ($mrc == CURLM_CALL_MULTI_PERFORM);
    } else {
        usleep(100);
        do {
            $mrc = curl_multi_exec($mh, $active);
        } while ($mrc == CURLM_CALL_MULTI_PERFORM);
    }
}

$suggestions = array();
$unique_titles = array();

foreach ($chs as $idx => $ch) {
    $response = curl_multi_getcontent($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if ($http_code === 200 && !empty($response)) {
        $res_data = json_decode($response, true);
        if (!empty($res_data['list'])) {
            foreach ($res_data['list'] as $item) {
                $title = isset($item['vod_name']) ? trim($item['vod_name']) : '';
                if (empty($title)) continue;
                
                $norm_title = preg_replace('/[\s\-\_\:\：\·]/u', '', mb_strtolower($title));
                if (!isset($unique_titles[$norm_title])) {
                    $unique_titles[$norm_title] = true;
                    $suggestions[] = array(
                        'id' => $idx . '_' . ($item['vod_id'] ?? '0'), // 带上源索引前缀
                        'title' => $title,
                        'type' => $item['type_name'] ?? '推荐',
                        'hint' => $item['vod_remarks'] ?? ''
                    );
                }
            }
        }
    }
    
    curl_multi_remove_handle($mh, $ch);
    if (PHP_VERSION_ID < 80000) {
        curl_close($ch);
    }
}

curl_multi_close($mh);

// 限制前 8 条，并写入高速缓存
$suggestions = array_slice($suggestions, 0, 8);
data_cache_set($cache_key, false, $suggestions);

echo json_encode($suggestions);
exit;
