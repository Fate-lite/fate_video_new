<?php
/**
 * Fate Video 后台运维监控仪表盘 (admin/status.php)
 * 免登录/免库架构下，采用本地文件状态缓存与 SCM 并发测速流水线
 */
session_start();

// 默认安全验证密码 (站长可自行修改该变量)
$auth_pass = "admin888";

// 退出登录
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    unset($_SESSION['fate_admin_auth']);
    header("Location: ./status.php");
    exit;
}

// 登录校验
$error_msg = "";
if (isset($_POST['password'])) {
    if ($_POST['password'] === $auth_pass) {
        $_SESSION['fate_admin_auth'] = true;
        header("Location: ./status.php");
        exit;
    } else {
        $error_msg = "密码校验失败，请重试";
    }
}

// 未登录展示登录界面
$is_logged_in = isset($_SESSION['fate_admin_auth']) && $_SESSION['fate_admin_auth'] === true;

// 引入 SQLite 数据库封装层
require_once __DIR__ . '/../data/db.php';

// 引入核心数据文件
$cache_dir = __DIR__ . '/../cache';

// 盘点缓存统计（SQLite）
function get_cache_stats($dir) {
    $db_stats = db_cache_stats();
    // 同时保留对旧文件缓存目录的统计，做降级兜底
    $file_size  = 0;
    $file_count = 0;
    if (is_dir($dir)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($files as $file) {
            if (!$file->isDir()) {
                $file_size  += $file->getSize();
                $file_count ++;
            }
        }
    }
    $db_file_size = db_file_size();
    return array(
        'count' => $db_stats['count'] + $file_count,
        'size'  => $db_stats['size_bytes'] + $file_size + $db_file_size,
    );
}

// 清空所有缓存（SQLite + 旧文件目录）
function clear_cache_dir($dir) {
    // 清空 SQLite 缓存表
    db_cache_clear();
    // 同时清理旧文件缓存目录（平滑迁移期兜底）
    if (!is_dir($dir)) return true;
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($files as $file) {
        $todo = $file->getRealPath();
        if ($file->isDir()) {
            @rmdir($todo);
        } else {
            @unlink($todo);
        }
    }
    return true;
}

// 友好显示数据源中文名映射
function get_api_friendly_name($url) {
    $host = parse_url($url, PHP_URL_HOST);
    if (empty($host)) {
        return $url;
    }
    $mapping = array(
        '360zy.com' => '360资源库',
        'iqiyizyapi.com' => '爱奇艺资源',
        'apibdzy.com' => '百度资源网',
        'lovedan.net' => '艾旦资源',
        'ddmf.net' => '蛋蛋资源',
        'xinlangapi.com' => '新浪资源库',
        'xkanzy.com' => '享看资源',
        'moduapi.cc' => '魔都资源库',
        'dyttzyapi.com' => '天堂资源',
        '118318.xyz' => '快龙资源',
        'maoyanapi.top' => '猫眼资源',
        'slapibf.com' => '森林资源',
        'seacms.org' => '花旗资源',
        'lziapi.com' => '量子资源库',
        'lzzy.tv' => '量子资源2',
        'suoniapi.com' => '索尼资源库',
        'kuaichezy.org' => '快车资源',
        'zuidapi.com' => '最大资源',
        'niuniuzy.me' => '牛牛资源',
        'okzyw.net' => 'OK资源',
        'sdzyapi.com' => '闪电资源',
        'yayazy.net' => '鸭鸭资源',
        'wujinapi.me' => '无尽资源',
        'guangsuapi.com' => '光速资源库',
        'subocaiji.com' => '速播资源',
        'suboziyuan.net' => '速播资源',
        'jyzyapi.com' => '金鹰资源',
        'hongniuzy2.com' => '红牛资源',
        'hhzyapi.com' => '豪华资源',
        'huyaapi.com' => '虎牙资源',
        'jszyapi.com' => '极速资源',
        'apiyhzy.com' => '樱花资源',
        'ffzyapi.com' => '非凡资源库',
        'p2100.net' => '飘零资源',
        '1080zyku.com' => '1080资源',
        'yzzy-api.com' => '优质资源',
        'mdzyapi.com' => '魔都资源',
        'rycjapi.com' => '如意资源',
        'ryzyw.com' => '如意资源',
        'ikeunzyapi.com' => 'iKun资源',
        'tyyszyapi.com' => '天涯资源',
        'ukuapi88.com' => 'U酷资源',
        'ukuapi.com' => 'U酷资源',
        'wyvod.com' => '无忧资源',
        'ckzy.me' => 'CK资源',
        'tiankongapi.com' => '天空资源库',
        'qilinzyz.com' => '麒麟资源',
        '39kan.com' => '39影资源',
    );
    foreach ($mapping as $key => $val) {
        if (strpos($host, $key) !== false) {
            return $val;
        }
    }
    return $host;
}

// 并发多路复用测速 (SCM 并发流水线模式)
function run_concurrent_ping($api_list) {
    $mh = curl_multi_init();
    $handles = array();
    $start_times = array();
    $attempts = array();      // 记录每个接口的尝试次数
    $urls = array();          // 记录每个接口的完整请求 URL
    
    $latencies = array();
    $final_responses = array();
    $final_http_codes = array();
    
    foreach ($api_list as $index => $api_url) {
        $query = http_build_query(array(
            'ac' => 'list',
            'wd' => '测试',
            'pg' => 1
        ));
        $url = $api_url . '?' . $query;
        $urls[$index] = $url;
        $attempts[$index] = 1;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3); // 每次尝试 3 秒超时
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Accept: application/json',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ));
        
        curl_multi_add_handle($mh, $ch);
        $handles[$index] = $ch;
        $start_times[$index] = microtime(true);
    }
    
    $active = null;
    do {
        $mrc = curl_multi_exec($mh, $active);
    } while ($mrc == CURLM_CALL_MULTI_PERFORM);
    
    while ($active && $mrc == CURLM_OK) {
        if (curl_multi_select($mh) == -1) {
            usleep(100);
        }
        do {
            $mrc = curl_multi_exec($mh, $active);
        } while ($mrc == CURLM_CALL_MULTI_PERFORM);
        
        // 实时读取已完成的 handle
        while ($info = curl_multi_info_read($mh)) {
            $completed_ch = $info['handle'];
            
            $found_idx = null;
            foreach ($handles as $index => $ch) {
                if ($ch === $completed_ch) {
                    $found_idx = $index;
                    break;
                }
            }
            
            if ($found_idx !== null) {
                $latency = round((microtime(true) - $start_times[$found_idx]) * 1000);
                $response = curl_multi_getcontent($completed_ch);
                $http_code = curl_getinfo($completed_ch, CURLINFO_HTTP_CODE);
                
                // 验证当前请求是否真正成功
                $is_success = false;
                if ($http_code === 200 && !empty($response)) {
                    $data = json_decode($response, true);
                    if (isset($data['code']) && $data['code'] == 1) {
                        $is_success = true;
                    }
                }
                
                if ($is_success) {
                    // 请求成功，记录结果并从 multi 中移除，关闭连接
                    $latencies[$found_idx] = $latency;
                    $final_responses[$found_idx] = $response;
                    $final_http_codes[$found_idx] = $http_code;
                    
                    curl_multi_remove_handle($mh, $completed_ch);
                    @curl_close($completed_ch);
                    unset($handles[$found_idx]);
                } else {
                    // 当前尝试失败，检查是否未满 3 次重试次数
                    if ($attempts[$found_idx] < 3) {
                        $attempts[$found_idx]++;
                        
                        // 移除并关闭当前失败的 curl 资源
                        curl_multi_remove_handle($mh, $completed_ch);
                        @curl_close($completed_ch);
                        
                        // 重新初始化并加入 multi 队列进行重试
                        $ch = curl_init();
                        curl_setopt($ch, CURLOPT_URL, $urls[$found_idx]);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 3); // 3 秒超时
                        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                            'Accept: application/json',
                            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
                            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        ));
                        
                        curl_multi_add_handle($mh, $ch);
                        $handles[$found_idx] = $ch;
                        $start_times[$found_idx] = microtime(true);
                        
                        // 立即执行以激活新连接的 Socket 监听
                        do {
                            $mrc = curl_multi_exec($mh, $active);
                        } while ($mrc == CURLM_CALL_MULTI_PERFORM);
                    } else {
                        // 满 3 次重试仍失败，记录失败结果
                        $latencies[$found_idx] = 9999;
                        $final_responses[$found_idx] = $response;
                        $final_http_codes[$found_idx] = $http_code;
                        
                        curl_multi_remove_handle($mh, $completed_ch);
                        @curl_close($completed_ch);
                        unset($handles[$found_idx]);
                    }
                }
            }
        }
    }
    
    // 收尾工作：如果还有异常滞留的连接（例如程序突发中止或异常情况），进行兜底清理
    foreach ($handles as $index => $ch) {
        $latencies[$index] = 9999;
        $final_responses[$index] = isset($final_responses[$index]) ? $final_responses[$index] : '';
        $final_http_codes[$index] = isset($final_http_codes[$index]) ? $final_http_codes[$index] : 0;
        curl_multi_remove_handle($mh, $ch);
        @curl_close($ch);
    }
    curl_multi_close($mh);
    
    // 构建返回的结果集
    $results = array();
    foreach ($api_list as $index => $api_url) {
        $http_code = $final_http_codes[$index];
        $response = $final_responses[$index];
        $latency = $latencies[$index];
        
        $status = 'Offline';
        $health = 'Unknown';
        
        if ($http_code === 200 && !empty($response)) {
            $data = json_decode($response, true);
            if (isset($data['code']) && $data['code'] == 1) {
                $status = 'Online';
                $health = 'Healthy';
            } else {
                $status = 'Online';
                $health = 'Corrupted JSON';
            }
        } else if ($http_code !== 0) {
            $status = 'Error';
            $health = 'HTTP ' . $http_code;
        } else {
            $status = 'Timeout';
            $health = 'No Response';
        }
        
        $host = parse_url($api_url, PHP_URL_HOST);
        $results[] = array(
            'url' => $api_url,
            'host' => $host,
            'name' => get_api_friendly_name($api_url),
            'latency' => $status === 'Online' ? $latency : 9999,
            'http_code' => $http_code,
            'status' => $status,
            'health' => $health
        );
    }
    
    return $results;
}


// 格式化文件体积大小
function format_bytes($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } elseif ($bytes > 1) {
        return $bytes . ' bytes';
    } elseif ($bytes == 1) {
        return '1 byte';
    } else {
        return '0 bytes';
    }
}

// AJax 处理入口
if ($is_logged_in && isset($_GET['action'])) {
    error_reporting(0);
    ini_set('display_errors', 0);
    header('Content-Type: application/json; charset=utf-8');
    
    if ($_GET['action'] === 'get_stats') {
        $stats = get_cache_stats($cache_dir);
        $stats['size_formatted'] = format_bytes($stats['size']);
        echo json_encode(array('success' => true, 'stats' => $stats));
        exit;
    }
    
    if ($_GET['action'] === 'clear_cache') {
        $success = clear_cache_dir($cache_dir);
        echo json_encode(array('success' => $success));
        exit;
    }

    if ($_GET['action'] === 'clear_search') {
        db_search_clear();
        header('Location: ./status.php');
        exit;
    }

    
    if ($_GET['action'] === 'save_sources') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(array('success' => false, 'message' => '仅允许 POST 请求'));
            exit;
        }
        
        $raw_post = file_get_contents('php://input');
        $post_data = json_decode($raw_post, true);
        
        if (!isset($post_data['sources']) || !is_array($post_data['sources'])) {
            echo json_encode(array('success' => false, 'message' => '数据格式不正确'));
            exit;
        }
        
        $new_sources = array();
        foreach ($post_data['sources'] as $src) {
            $src = trim($src);
            if (!empty($src)) {
                if (preg_match('/^https?:\/\/.+/i', $src)) {
                    $new_sources[] = $src;
                }
            }
        }
        $new_sources = array_values(array_unique($new_sources));
        
        if (empty($new_sources)) {
            echo json_encode(array('success' => false, 'message' => '必须保留至少一个有效的采集源'));
            exit;
        }
        
        $sources_file = __DIR__ . '/../data/sources.php';
        $content = "<?php\n// Fate Video 采集源配置文件，由后台监控面板自动生成\nreturn " . var_export($new_sources, true) . ";\n";
        
        if (@file_put_contents($sources_file, $content) !== false) {
            if (file_exists($cache_status_file)) {
                @unlink($cache_status_file);
            }
            echo json_encode(array('success' => true));
        } else {
            echo json_encode(array('success' => false, 'message' => '写入配置文件失败，请检查文件写入权限'));
        }
        exit;
    }

    if ($_GET['action'] === 'get_latest_updates') {
        if (file_exists(__DIR__ . '/../data/index.php')) {
            ob_start();
            require_once __DIR__ . '/../data/index.php';
            ob_end_clean();
        }
        global $cms_api_list;
        
        $mh = curl_multi_init();
        $handles = array();
        
        foreach ($cms_api_list as $index => $api_url) {
            $query = http_build_query(array(
                'ac' => 'list',
                'h' => 24, // 24小时内更新
                'pg' => 1
            ));
            $url = $api_url . '?' . $query;
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3); // 3 秒超时
            
            curl_multi_add_handle($mh, $ch);
            $handles[$index] = $ch;
        }
        
        $active = null;
        do {
            $mrc = curl_multi_exec($mh, $active);
        } while ($mrc == CURLM_CALL_MULTI_PERFORM);
        
        while ($active && $mrc == CURLM_OK) {
            if (curl_multi_select($mh) == -1) {
                usleep(100);
            }
            do {
                $mrc = curl_multi_exec($mh, $active);
            } while ($mrc == CURLM_CALL_MULTI_PERFORM);
        }
        
        $updates = array();
        foreach ($handles as $index => $ch) {
            $response = curl_multi_getcontent($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $source_name = parse_url($cms_api_list[$index], PHP_URL_HOST);
            
            if ($http_code === 200 && !empty($response)) {
                $data = json_decode($response, true);
                if (!empty($data['list'])) {
                    foreach ($data['list'] as $vod) {
                        $raw_time = isset($vod['vod_time']) ? strtotime($vod['vod_time']) : false;
                        if ($raw_time === false) {
                            $raw_time = time();
                        }
                        $updates[] = array(
                            'title' => $vod['vod_name'] ?? '无标题',
                            'type' => $vod['type_name'] ?? '其他',
                            'source' => $source_name,
                            'time' => $vod['vod_time'] ?? date('Y-m-d H:i:s'),
                            'raw_time' => $raw_time
                        );
                    }
                }
            }
            curl_multi_remove_handle($mh, $ch);
            if (PHP_VERSION_ID < 80000) {
                @curl_close($ch);
            }
        }
        curl_multi_close($mh);
        
        // 按时间降序排序
        usort($updates, function($a, $b) {
            return $b['raw_time'] <=> $a['raw_time'];
        });
        
        // 全局去重（按名称）
        $unique_updates = array();
        $seen = array();
        foreach ($updates as $item) {
            $title = $item['title'] ?? '';
            $norm = preg_replace('/[\s\-\_\:\：\·]/u', '', mb_strtolower($title));
            if (!isset($seen[$norm])) {
                $seen[$norm] = true;
                $unique_updates[] = $item;
            }
        }
        
        // 截取前 15 条
        $result_updates = array_slice($unique_updates, 0, 15);
        
        echo json_encode(array(
            'success' => true,
            'total_today' => count($unique_updates),
            'list' => $result_updates
        ));
        exit;
    }

    if ($_GET['action'] === 'warmup_cache') {
        set_time_limit(0);
        if (file_exists(__DIR__ . '/../data/index.php')) {
            ob_start();
            require_once __DIR__ . '/../data/index.php';
            ob_end_clean();
        }
        
        $warmup_targets = array(
            'index' => array('name' => '首页精选数据', 'params' => array('act' => 'index')),
            'dianying' => array('name' => '电影频道 (第一页)', 'params' => array('act' => 'list', 'type' => 'dianying', 'page' => 1)),
            'dianshi' => array('name' => '电视剧频道 (第一页)', 'params' => array('act' => 'list', 'type' => 'dianshi', 'page' => 1)),
            'zongyi' => array('name' => '综艺频道 (第一页)', 'params' => array('act' => 'list', 'type' => 'zongyi', 'page' => 1)),
            'dongman' => array('name' => '动漫频道 (第一页)', 'params' => array('act' => 'list', 'type' => 'dongman', 'page' => 1))
        );
        
        $logs = array();
        $success_count = 0;
        
        foreach ($warmup_targets as $key => $target) {
            $start = microtime(true);
            $data_res = cms_data_fetch($target['params']);
            $latency = round((microtime(true) - $start) * 1000);
            
            if ($data_res !== false) {
                $cache_key = json_encode($target['params']);
                data_cache_set($cache_key, false, $data_res);
                
                $logs[] = array(
                    'key' => $key,
                    'name' => $target['name'],
                    'success' => true,
                    'latency' => $latency,
                    'message' => '预热成功，耗时 ' . $latency . 'ms'
                );
                $success_count++;
            } else {
                $logs[] = array(
                    'key' => $key,
                    'name' => $target['name'],
                    'success' => false,
                    'latency' => $latency,
                    'message' => '预热失败'
                );
            }
        }
        
        echo json_encode(array(
            'success' => $success_count > 0,
            'success_count' => $success_count,
            'total_count' => count($warmup_targets),
            'logs' => $logs
        ));
        exit;
    }
    
    if ($_GET['action'] === 'diagnostic') {
        set_time_limit(0);
        // 加载数据源
        if (file_exists(__DIR__ . '/../data/index.php')) {
            // 拦截直接运行输出
            ob_start();
            require_once __DIR__ . '/../data/index.php';
            ob_end_clean();
        }
        
        global $cms_api_list;
        if (empty($cms_api_list)) {
            // 降级保护
            $cms_api_list = array(
                'http://cj.lziapi.com/api.php/provide/vod/',
                'https://api.xinlangapi.com/xinlangapi.php/provide/vod/'
            );
        }
        
        $diagnostic_results = run_concurrent_ping($cms_api_list);

        // 将测速结果批量写入 SQLite source_status 表
        $batch = array();
        foreach ($diagnostic_results as $r) {
            $batch[] = array(
                'url'     => $r['url'],
                'latency' => $r['latency'] ?? -1,
                'online'  => ($r['status'] === 'Online'),
            );
        }
        db_source_upsert_batch($batch);

        echo json_encode(array(
            'success'      => true,
            'last_updated' => date('Y-m-d H:i:s'),
            'results'      => $diagnostic_results
        ));
        exit;
    }
}

// 从 SQLite 读取上一次测速的状态快照
$history_status = false;
if ($is_logged_in) {
    $db_sources = db_source_list(3600);
    if ($db_sources) {
        $history_status = array(
            'last_updated' => date('Y-m-d H:i:s', $db_sources[0]['last_check'] ?? time()),
            'results'      => array_map(function($r) {
                return array(
                    'url'      => $r['api_url'],
                    'host'     => parse_url($r['api_url'], PHP_URL_HOST),
                    'name'     => get_api_friendly_name($r['api_url']),
                    'latency'  => (int)$r['latency_ms'],
                    'status'   => $r['is_online'] ? 'Online' : 'Offline',
                    'health'   => $r['is_online'] ? 'Healthy' : 'No Response',
                    'http_code'=> $r['is_online'] ? 200 : 0,
                );
            }, $db_sources),
        );
    }
}

// 热搜榜数据（Top 20）
$hot_search_list = $is_logged_in ? db_search_hot(20) : [];

// 降级与兜底渲染：无论是否有缓存，如果已登录，都将实时的当前配置源列表解析到 $current_sources
$current_sources = array();
if ($is_logged_in) {
    global $cms_api_list;
    if (empty($cms_api_list)) {
        if (file_exists(__DIR__ . '/../data/index.php')) {
            ob_start();
            include __DIR__ . '/../data/index.php';
            ob_end_clean();
        }
    }
    if (!empty($cms_api_list)) {
        foreach ($cms_api_list as $api_url) {
            $host = parse_url($api_url, PHP_URL_HOST);
            $current_sources[] = array(
                'url' => $api_url,
                'host' => $host ? $host : $api_url,
                'name' => get_api_friendly_name($api_url),
                'status' => 'Unknown',
                'latency' => 0
            );
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
<title>Fate Video 监控仪表盘</title>
<link href="../static_yk/images/icon-192.png" rel="shortcut icon">
<style>
:root {
    --bg-color: #04050d;
    --card-bg: rgba(13, 14, 33, 0.55);
    --border-color: rgba(255, 255, 255, 0.05);
    --primary: #6366f1;
    --primary-glow: rgba(99, 102, 241, 0.25);
    --accent: #a855f7;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
}
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
html {
    background: var(--bg-color);
}
body {
    background: radial-gradient(circle at top center, #161838 0%, #090a18 50%, #04050d 100%) no-repeat fixed;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    min-height: 100vh;
    padding: 32px 24px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.01);
}
::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}

/* Ambient Glow */
body::before {
    content: "";
    position: fixed;
    top: -200px;
    left: -150px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0) 70%);
    border-radius: 50%;
    filter: blur(100px);
    z-index: -1;
    pointer-events: none;
}

.container {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
}

/* Glassmorphism Panel */
.panel {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
}
.panel:hover {
    border-color: rgba(99, 102, 241, 0.2);
    box-shadow: 0 20px 45px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
}

/* Auth Page */
.auth-panel {
    max-width: 420px;
    margin: 10vh auto 0;
    text-align: center;
    padding: 40px 30px;
}
.auth-logo {
    width: 120px;
    height: 32px;
    background: url('../static_yk/images/logo.png') no-repeat center;
    background-size: contain;
    margin: 0 auto 24px;
}
.auth-title {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
    color: #fff;
}
.auth-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 28px;
}
.input-box {
    margin-bottom: 20px;
    position: relative;
}
.input-box input {
    width: 100%;
    height: 48px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 0 20px;
    color: #fff;
    font-size: 14px;
    outline: none;
    text-align: center;
    transition: all 0.3s ease;
}
.input-box input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 15px var(--primary-glow);
    background: rgba(255, 255, 255, 0.05);
}
.auth-btn {
    width: 100%;
    height: 48px;
    border: none;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: #fff;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.25);
    transition: all 0.2s ease;
}
.auth-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.45);
}
.error-tip {
    font-size: 12px;
    color: var(--danger);
    margin-top: 12px;
}

/* Header */
.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
}
.header-title-box h1 {
    font-size: 26px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.header-title-box h1 span {
    font-size: 11px;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: #fff;
    padding: 2px 8px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.header-title-box p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 4px;
}
.logout-btn {
    padding: 8px 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    color: rgba(255, 255, 255, 0.7);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
}
.logout-btn:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
}

/* Layout Grid */
.layout-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
}

/* Status Cards */
.status-card {
    display: flex;
    align-items: center;
    gap: 20px;
    width: 100%;
}
.card-icon {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.05));
    border: 1px solid rgba(99, 102, 241, 0.25);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #818cf8;
    font-size: 20px;
    flex-shrink: 0;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}
.card-info {
    flex-grow: 1;
}
.card-info h3 {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
    font-weight: 500;
}
.card-info p {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-top: 3px;
}
.card-action-btn {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
}
.card-action-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.15);
}
.card-action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

#clearCacheBtn:hover {
    background: rgba(239, 68, 68, 0.12);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.3);
}

/* SCM Diagnostic Terminal */
.terminal-panel {
    background: rgba(8, 8, 20, 0.85);
    padding: 0 !important;
}
.terminal-header {
    background: rgba(15, 16, 35, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    padding: 12px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.terminal-dots {
    display: flex;
    gap: 8px;
}
.terminal-dots span {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    display: inline-block;
}
.dot-red { background: #ff5f56; }
.dot-yellow { background: #ffbd2e; }
.dot-green { background: #27c93f; }
.terminal-title {
    color: rgba(255, 255, 255, 0.55);
    font-size: 11.5px;
    font-weight: 600;
    font-family: Menlo, Monaco, Consolas, monospace;
}
.terminal-action-text {
    color: rgba(255, 255, 255, 0.2);
    font-size: 10px;
    font-family: monospace;
}
.panel-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}
.panel-title {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.panel-title::before {
    content: "";
    display: inline-block;
    width: 6px;
    height: 6px;
    background: var(--primary);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--primary);
}
.terminal-screen {
    width: 100%;
    height: 150px;
    background: #03030b;
    padding: 16px 20px;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.8);
    overflow-y: auto;
    line-height: 1.6;
}
.terminal-line {
    margin-bottom: 6px;
    white-space: pre-wrap;
    word-break: break-all;
}
.terminal-time {
    color: rgba(255, 255, 255, 0.25);
    margin-right: 8px;
    font-weight: 500;
}
.terminal-line.success { color: var(--success); }
.terminal-line.warning { color: var(--warning); }
.terminal-line.danger { color: var(--danger); }
.terminal-line.log { color: rgba(255, 255, 255, 0.45); }

/* Radar Status Grid */
.radar-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
}
.radar-node {
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}
.radar-node::after {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.04) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}
.radar-node:hover::after {
    opacity: 1;
}
.radar-node:hover {
    border-color: rgba(99, 102, 241, 0.2);
    background: rgba(255, 255, 255, 0.03);
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}
.node-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
}
/* Indicator lights */
.node-status-dot.online {
    background: var(--success);
    box-shadow: 0 0 10px var(--success), 0 0 20px rgba(16, 185, 129, 0.4);
    animation: pulse-green 1.8s infinite;
}
.node-status-dot.slow {
    background: var(--warning);
    box-shadow: 0 0 10px var(--warning), 0 0 20px rgba(245, 158, 11, 0.4);
    animation: pulse-yellow 1.8s infinite;
}
.node-status-dot.offline {
    background: var(--danger);
    box-shadow: 0 0 10px var(--danger), 0 0 20px rgba(239, 68, 68, 0.4);
}
@keyframes pulse-yellow {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
}

.node-info {
    flex-grow: 1;
    min-width: 0;
}
.node-name {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.node-url {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
}
.node-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(255,255,255,0.04);
    flex-shrink: 0;
}
.node-badge.fast {
    color: #34d399;
    background: rgba(52, 211, 153, 0.1);
}
.node-badge.mid {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
}
.node-badge.timeout {
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
}

@keyframes pulse-green {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
}

/* Today Updates Table */
.updates-table-container table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;
}
.updates-table-container th {
    padding: 12px 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.updates-table-container tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    transition: all 0.2s ease;
}
.updates-table-container tbody tr:hover {
    background: rgba(255, 255, 255, 0.015);
}
.updates-table-container td {
    padding: 12px 10px;
    vertical-align: middle;
}

/* Skeleton Loading */
.skeleton-row td {
    padding: 16px 10px !important;
}
.skeleton-line {
    height: 12px;
    background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 37%, rgba(255,255,255,0.02) 63%);
    background-size: 400% 100%;
    animation: skeleton-loading 1.4s ease infinite;
    border-radius: 4px;
}
@keyframes skeleton-loading {
    0% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

/* Drag and Drop Feedback */
#radarGrid.dragging-active .radar-node * {
    pointer-events: none;
}
.radar-node.dragging {
    opacity: 0.35;
    border: 1px dashed var(--primary) !important;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.2) !important;
    transform: scale(0.98);
}
.radar-node.drag-over {
    border-color: var(--primary) !important;
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.25) !important;
    transform: translateY(-2px);
    background: rgba(99, 102, 241, 0.05) !important;
}
.radar-node[draggable="true"] {
    cursor: grab;
}
.radar-node[draggable="true"]:active {
    cursor: grabbing;
}

/* Radar Node Actions */
.radar-node .node-actions {
    position: absolute;
    top: 0;
    right: -80px; /* 初始收纳在卡片右侧外部 */
    bottom: 0;
    width: 75px;
    background: linear-gradient(90deg, rgba(13, 14, 33, 0) 0%, rgba(13, 14, 33, 0.95) 20%, rgba(13, 14, 33, 0.98) 100%);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    padding-right: 14px;
    transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 15;
}
.radar-node:hover .node-actions {
    right: 0; /* hover 时顺滑滑入，覆盖延迟 badge */
}
.action-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}
.action-icon:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.35);
    color: #a5b4fc;
    transform: scale(1.05);
}
.action-icon.delete-action:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.35);
    color: #f87171;
}

/* Modal Popup Dialog */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(4, 5, 13, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-overlay.active {
    opacity: 1;
    pointer-events: auto;
}
.modal-container {
    width: 90%;
    max-width: 500px;
    background: rgba(15, 16, 35, 0.85);
    border: 1px solid rgba(99, 102, 241, 0.25);
    border-radius: 16px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15);
    overflow: hidden;
    transform: scale(0.9);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-overlay.active .modal-container {
    transform: scale(1);
}
.modal-header {
    background: rgba(20, 21, 46, 0.95);
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.modal-header h3 {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
}
.modal-close {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    font-size: 20px;
    cursor: pointer;
    transition: color 0.2s ease;
}
.modal-close:hover {
    color: #fff;
}
.modal-body {
    padding: 24px 20px;
}
.form-group {
    margin-bottom: 20px;
}
.form-group label {
    display: block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 8px;
    font-weight: 500;
}
.form-group input {
    width: 100%;
    height: 44px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0 14px;
    color: #fff;
    font-size: 13px;
    outline: none;
    transition: all 0.3s ease;
}
.form-group input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 15px var(--primary-glow);
    background: rgba(255, 255, 255, 0.05);
}
.modal-footer {
    padding: 16px 20px;
    background: rgba(20, 21, 46, 0.5);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
.modal-btn {
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}
.modal-btn.cancel-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
}
.modal-btn.cancel-btn:hover {
    border-color: rgba(255, 255, 255, 0.25);
    color: #fff;
}
.modal-btn.save-btn {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    border: none;
    color: #fff;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
}
.modal-btn.save-btn:hover {
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
}

/* Responsive */
@media(max-width: 768px) {
    body { padding: 16px 12px; }
    .layout-grid { grid-template-columns: 1fr; gap: 16px; }
    .dashboard-header { flex-direction: column; align-items: flex-start; gap: 14px; }
    .logout-btn { align-self: flex-end; }
    .panel { padding: 20px; }
    .status-card { flex-wrap: wrap; }
    .card-action-btn { width: 100%; text-align: center; margin-top: 10px; }
    .radar-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<?php if (!$is_logged_in): ?>
    <!-- Auth Screen -->
    <div class="panel auth-panel">
        <div class="auth-logo"></div>
        <h2 class="auth-title">监控控制台</h2>
        <p class="auth-desc">请输入后台管理员密码进入运维监测系统</p>
        <form method="post" action="./status.php">
            <div class="input-box">
                <input type="password" name="password" placeholder="请输入密码" autocomplete="current-password" required autofocus />
            </div>
            <button type="submit" class="auth-btn">身份校验</button>
            <?php if (!empty($error_msg)): ?>
                <div class="error-tip"><?php echo htmlspecialchars($error_msg); ?></div>
            <?php endif; ?>
        </form>
    </div>
<?php else: ?>
    <!-- Dashboard Screen -->
    <div class="container">
        
        <div class="dashboard-header">
            <div class="header-title-box">
                <h1>Fate Video 运维监控仪表盘 <span>v2.0 pro</span></h1>
                <p>实时掌控采集源连通率与服务器缓存指标</p>
            </div>
            <a href="./status.php?action=logout" class="logout-btn">安全退出</a>
        </div>

        <div class="layout-grid">
            <!-- Cache Panel -->
            <div class="panel">
                <div class="status-card">
                    <div class="card-icon">📁</div>
                    <div class="card-info">
                        <h3>服务器缓存盘点</h3>
                        <p id="cacheSummary">加载中...</p>
                    </div>
                    <div style="display:flex; gap: 8px; margin-left: auto;">
                        <button class="card-action-btn" id="warmupCacheBtn" style="background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.25); color: #34d399;">一键预热</button>
                        <button class="card-action-btn" id="clearCacheBtn">一键清理</button>
                    </div>
                </div>
            </div>

            <!-- Server Node Status -->
            <div class="panel">
                <div class="status-card">
                    <div class="card-icon">⚡</div>
                    <div class="card-info">
                        <h3>并发雷达诊断</h3>
                        <p id="radarSummary"><?php echo $history_status ? '已加载历史缓存' : '尚未进行健康诊断'; ?></p>
                    </div>
                    <button class="card-action-btn" id="runDiagnosticBtn" style="margin-left:auto; background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.25); color: #a5b4fc;">诊断 API</button>
                </div>
            </div>
        </div>

        <!-- 热搜榜 -->
        <div class="panel" style="margin-top: 16px;">
            <div style="padding: 18px 20px 6px; display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px;">🔥</span>
                <h3 style="margin:0; font-size:15px; color: var(--text-primary); font-weight:600;">用户搜索热词榜</h3>
                <span style="margin-left:auto; font-size:12px; color:var(--text-muted);">统计自用户实际搜索行为 · Top 20</span>
                <button onclick="if(confirm('确认清空所有搜索记录？')) location.href='?action=clear_search'" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#f87171;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">清空记录</button>
            </div>
            <?php if (empty($hot_search_list)): ?>
            <p style="padding:16px 20px; color:var(--text-muted); font-size:14px;">暂无搜索记录，用户使用搜索功能后将在此显示。</p>
            <?php else: ?>
            <div style="display:flex; flex-wrap:wrap; gap:8px; padding:12px 20px 20px;">
                <?php foreach ($hot_search_list as $i => $item): ?>
                <?php
                    $rank_color = $i === 0 ? '#f97316' : ($i === 1 ? '#a855f7' : ($i === 2 ? '#3b82f6' : 'rgba(255,255,255,0.5)'));
                    $count = (int)$item['count'];
                ?>
                <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:6px 12px;">
                    <span style="font-size:11px; font-weight:700; color:<?php echo $rank_color; ?>; min-width:18px;"><?php echo $i + 1; ?></span>
                    <span style="font-size:13px; color:var(--text-primary);"><?php echo htmlspecialchars($item['keyword']); ?></span>
                    <span style="font-size:11px; color:var(--text-muted); background:rgba(255,255,255,0.06); border-radius:4px; padding:1px 6px;"><?php echo $count; ?>次</span>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>

        <!-- SCM Diagnostic Console -->
        <div class="panel terminal-panel">
            <div class="terminal-header">
                <div class="terminal-dots">
                    <span class="dot-red"></span>
                    <span class="dot-yellow"></span>
                    <span class="dot-green"></span>
                </div>
                <div class="terminal-title">SCM Concurrent Monitor Terminal</div>
                <div class="terminal-action-text">bash - 1100px</div>
            </div>
            <div class="terminal-screen" id="terminalScreen">
                <div class="terminal-line log"><span class="terminal-time">[<?php echo date('H:i:s'); ?>]</span>> Status system initialized. Read-only caching ready.</div>
                <?php if ($history_status): ?>
                    <div class="terminal-line log"><span class="terminal-time">[<?php echo date('H:i:s', strtotime($history_status['last_updated'])); ?>]</span>> Detected history state (<?php echo $history_status['last_updated']; ?>).</div>
                <?php endif; ?>
            </div>
        </div>

        <!-- 今日采集最新入库 Panel -->
        <div class="panel">
            <div class="panel-header-row">
                <h2 class="panel-title">今日采集最新入库 (全网聚合)</h2>
            </div>
            <div class="updates-table-container" style="overflow-x:auto; margin-top: 10px;">
                <table>
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4);">
                            <th style="padding:12px 10px;">影片名称</th>
                            <th style="padding:12px 10px; width: 150px;">分类</th>
                            <th style="padding:12px 10px; width: 180px;">来源渠道</th>
                            <th style="padding:12px 10px; width: 180px; text-align: right;">更新时间</th>
                        </tr>
                    </thead>
                    <tbody id="updatesTableBody">
                        <tr class="skeleton-row">
                            <td colspan="4">
                                <div class="skeleton-line"></div>
                            </td>
                        </tr>
                        <tr class="skeleton-row">
                            <td colspan="4">
                                <div class="skeleton-line"></div>
                            </td>
                        </tr>
                        <tr class="skeleton-row">
                            <td colspan="4">
                                <div class="skeleton-line"></div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Radar Nodes Grid -->
        <div class="panel">
            <div class="panel-header-row">
                <h2 class="panel-title">数据采集源延迟雷达 (实时排序)</h2>
                <button class="card-action-btn" id="addSourceBtn" style="background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.25); color: #a5b4fc; padding: 6px 14px; font-size: 11px;">➕ 新增数据源</button>
            </div>
            <div class="radar-grid" id="radarGrid">
                <?php 
                $render_nodes = array();
                if ($history_status && !empty($history_status['results'])) {
                    $render_nodes = $history_status['results'];
                } else if (!empty($current_sources)) {
                    $render_nodes = $current_sources;
                }
                
                if (!empty($render_nodes)): ?>
                    <?php foreach ($render_nodes as $node): 
                        $status_class = 'offline';
                        $badge_class = 'timeout';
                        $badge_text = 'FAIL';
                        if (isset($node['status']) && $node['status'] === 'Online') {
                            $status_class = 'online';
                            if ($node['latency'] < 300) {
                                $badge_class = 'fast';
                                $badge_text = $node['latency'] . 'ms';
                            } else {
                                $badge_class = 'mid';
                                $badge_text = $node['latency'] . 'ms';
                            }
                        } elseif (isset($node['status']) && $node['status'] === 'Unknown') {
                            $status_class = 'slow';
                            $badge_class = 'mid';
                            $badge_text = '待探测';
                        }
                        $display_host = isset($node['host']) ? $node['host'] : parse_url($node['url'], PHP_URL_HOST);
                    ?>
                        <div class="radar-node" data-url="<?php echo htmlspecialchars($node['url']); ?>">
                            <span class="node-status-dot <?php echo $status_class; ?>"></span>
                            <div class="node-info">
                                <div class="node-name"><?php echo htmlspecialchars($node['name']); ?></div>
                                <div class="node-url"><?php echo htmlspecialchars($display_host); ?></div>
                            </div>
                            <span class="node-badge <?php echo $badge_class; ?>"><?php echo $badge_text; ?></span>
                            <div class="node-actions">
                                <span class="action-icon edit-node-btn" title="编辑链接">✏️</span>
                                <span class="action-icon delete-action delete-node-btn" title="删除采集源">❌</span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; padding: 20px 0;">
                        请点击右上方 “诊断 API” 按钮启动并发网络探测
                    </div>
                <?php endif; ?>
            </div>
        </div>

    </div>

    <!-- Add/Edit Source Modal -->
    <div class="modal-overlay" id="sourceModal">
        <div class="modal-container">
            <div class="modal-header">
                <h3 id="modalTitle">配置采集数据源</h3>
                <button class="modal-close" id="closeModalBtn">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="editOriginalUrl" value="">
                <div class="form-group">
                    <label for="sourceUrlInput">数据源接口链接 (Cms Provide API URL)</label>
                    <input type="url" id="sourceUrlInput" placeholder="https://domain.com/api.php/provide/vod/" required>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn cancel-btn" id="cancelModalBtn">取消</button>
                <button class="modal-btn save-btn" id="saveModalBtn">确认保存</button>
            </div>
        </div>
    </div>

    <!-- jQuery for AJAX handlers -->
    <script src="../static_yk/js/jquery.min.js"></script>
    <script>
    $(function(){
        // ================= 拖拽排序逻辑 (HTML5 Drag and Drop) =================
        var dragSrcEl = null;

        function initDragAndDrop() {
            $('.radar-node').each(function() {
                $(this).attr('draggable', 'true');
                $(this).find('.node-actions').attr('draggable', 'false');
            });
        }
        initDragAndDrop();

        var $grid = $('#radarGrid');
        $grid.on('dragstart', '.radar-node', function(e) {
            if ($(e.target).closest('.node-actions').length > 0) {
                e.preventDefault();
                return;
            }
            dragSrcEl = this;
            $(this).addClass('dragging');
            $grid.addClass('dragging-active');
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            e.originalEvent.dataTransfer.setData('text/plain', $(this).attr('data-url'));
            logToTerminal('SCM config: Drag sequence initiated...', 'log');
        });

        $grid.on('dragover', '.radar-node', function(e) {
            e.preventDefault();
            if (dragSrcEl === this) return;
            $(this).addClass('drag-over');
        });

        $grid.on('dragenter', '.radar-node', function(e) {
            e.preventDefault();
        });

        $grid.on('dragleave', '.radar-node', function() {
            $(this).removeClass('drag-over');
        });

        $grid.on('dragend', '.radar-node', function() {
            $('.radar-node').removeClass('dragging drag-over');
            $grid.removeClass('dragging-active');
            dragSrcEl = null;
        });

        $grid.on('drop', '.radar-node', function(e) {
            e.preventDefault();
            $(this).removeClass('drag-over');
            
            if (dragSrcEl && dragSrcEl !== this) {
                var $dragged = $(dragSrcEl);
                var $target = $(this);
                
                var draggedIdx = $dragged.index();
                var targetIdx = $target.index();
                
                if (draggedIdx < targetIdx) {
                    $dragged.insertAfter($target);
                } else {
                    $dragged.insertBefore($target);
                }
                
                var urls = getExistingUrls();
                logToTerminal('SCM priority writer: Drag-and-drop sequence complete. Re-ordering sources...', 'warning');
                saveSourcesToServer(urls, function(){
                    logToTerminal('New sequence verified. Spawning network diagnostic sweep...', 'success');
                    $('#runDiagnosticBtn').trigger('click');
                });
            }
        });
        // 来源徽标映射
        function getSourceBadge(source) {
            if (!source) return '';
            source = source.toLowerCase();
            var badges = {
                'lziapi.com': { text: '量子资源', bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)' },
                'suoniapi.com': { text: '索尼资源', bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.25)' },
                'xinlangapi.com': { text: '新浪资源', bg: 'rgba(249, 115, 22, 0.12)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.25)' },
                'apibdzy.com': { text: '百度资源', bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.25)' },
                'moduapi.cc': { text: '魔都资源', bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
                'haiwaikan.com': { text: '海外资源', bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6', border: 'rgba(236, 72, 153, 0.25)' },
                'tiankongapi.com': { text: '天空资源', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.25)' },
                '360zy.com': { text: '360资源', bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: 'rgba(234, 179, 8, 0.25)' },
                'ikunzyapi.com': { text: 'iKun资源', bg: 'rgba(217, 70, 239, 0.12)', color: '#e879f9', border: 'rgba(217, 70, 239, 0.25)' },
                'ffzyapi.com': { text: '非凡资源', bg: 'rgba(220, 38, 38, 0.12)', color: '#f87171', border: 'rgba(220, 38, 38, 0.25)' },
                'guangsuapi.com': { text: '光速资源', bg: 'rgba(20, 184, 166, 0.12)', color: '#2dd4bf', border: 'rgba(20, 184, 166, 0.25)' },
                'lovedan.net': { text: '艾旦资源', bg: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.25)' },
                'ddmf.net': { text: '蛋蛋资源', bg: 'rgba(244, 63, 94, 0.12)', color: '#fb7185', border: 'rgba(244, 63, 94, 0.25)' },
                'dyttzyapi.com': { text: '天堂资源', bg: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee', border: 'rgba(6, 182, 212, 0.25)' },
                '118318.xyz': { text: '快龙资源', bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.25)' },
                'maoyanapi.top': { text: '猫眼资源', bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
                'zuidapi.com': { text: '最大资源', bg: 'rgba(249, 115, 22, 0.12)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.25)' },
                'wujinapi.me': { text: '无尽资源', bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.25)' },
                'subocaiji.com': { text: '速播资源', bg: 'rgba(20, 184, 166, 0.12)', color: '#2dd4bf', border: 'rgba(20, 184, 166, 0.25)' },
                'suboziyuan.net': { text: '速播资源', bg: 'rgba(20, 184, 166, 0.12)', color: '#2dd4bf', border: 'rgba(20, 184, 166, 0.25)' },
                'jyzyapi.com': { text: '金鹰资源', bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: 'rgba(234, 179, 8, 0.25)' },
                'hongniuzy2.com': { text: '红牛资源', bg: 'rgba(220, 38, 38, 0.12)', color: '#f87171', border: 'rgba(220, 38, 38, 0.25)' },
                'hhzyapi.com': { text: '豪华资源', bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6', border: 'rgba(236, 72, 153, 0.25)' },
                'huyaapi.com': { text: '虎牙资源', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.25)' },
                'jszyapi.com': { text: '极速资源', bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)' },
                'p2100.net': { text: '飘零资源', bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', border: 'rgba(139, 92, 246, 0.25)' },
                '1080zyku.com': { text: '1080资源', bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.25)' },
                'yzzy-api.com': { text: '优质资源', bg: 'rgba(236, 72, 153, 0.12)', color: '#f472b6', border: 'rgba(236, 72, 153, 0.25)' },
                'mdzyapi.com': { text: '魔都资源', bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: 'rgba(239, 68, 68, 0.25)' },
                'rycjapi.com': { text: '如意资源', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.25)' },
                'ryzyw.com': { text: '如意资源', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: 'rgba(16, 185, 129, 0.25)' },
                'wyvod.com': { text: '无忧资源', bg: 'rgba(234, 179, 8, 0.12)', color: '#facc15', border: 'rgba(234, 179, 8, 0.25)' },
                'ckzy.me': { text: 'CK资源', bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.25)' },
                'ikeunzyapi.com': { text: 'iKun资源', bg: 'rgba(217, 70, 239, 0.12)', color: '#e879f9', border: 'rgba(217, 70, 239, 0.25)' }
            };
            
            for (var key in badges) {
                if (source.indexOf(key) !== -1) {
                    var b = badges[key];
                    return '<span class="source-badge" style="background:' + b.bg + '; color:' + b.color + '; border:1px solid ' + b.border + '; padding: 3px 8px; border-radius: 6px; font-size:11px; font-weight:600; display:inline-block;">' + b.text + '</span>';
                }
            }
            return '<span class="source-badge" style="background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.6); border:1px solid rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 6px; font-size:11px; font-weight:600; display:inline-block;">' + source + '</span>';
        }

        // 获取并盘点缓存
        function fetchCacheStats() {
            $.getJSON('./status.php?action=get_stats', function(res){
                if(res.success) {
                    $('#cacheSummary').text(res.stats.size_formatted + ' (' + res.stats.count + ' 个文件)');
                } else {
                    $('#cacheSummary').text('盘点失败');
                }
            });
        }
        fetchCacheStats();

        // 盘点今日采集更新
        function fetchLatestUpdates() {
            var $tbody = $('#updatesTableBody');
            $.getJSON('./status.php?action=get_latest_updates', function(res){
                if(res.success && res.list.length > 0) {
                    var html = '';
                    res.list.forEach(function(item){
                        html += '<tr>';
                        html += '  <td style="padding:12px 10px; font-weight:600; color:#fff;">' + escapeHtml(item.title) + '</td>';
                        html += '  <td style="padding:12px 10px; color:rgba(255,255,255,0.65);">' + escapeHtml(item.type) + '</td>';
                        html += '  <td style="padding:12px 10px;">' + getSourceBadge(item.source) + '</td>';
                        html += '  <td style="padding:12px 10px; text-align:right; color:rgba(255,255,255,0.4);">' + escapeHtml(item.time) + '</td>';
                        html += '</tr>';
                    });
                    $tbody.html(html);
                    logToTerminal('AppleCMS Collection Radar: Found ' + res.total_today + ' updates across repositories today. Merged & showing top 15.', 'success');
                } else {
                    $tbody.html('<tr><td colspan="4" style="text-align:center; color:rgba(255,255,255,0.3); padding:24px 0;">今日暂无新入库影片或接口连接失败</td></tr>');
                }
            }).fail(function(){
                $tbody.html('<tr><td colspan="4" style="text-align:center; color:var(--danger); padding:24px 0;">无法连接数据源，更新列表获取失败</td></tr>');
            });
        }
        fetchLatestUpdates();

        // 打印终端日志逻辑
        function logToTerminal(text, type) {
            var $screen = $('#terminalScreen');
            var className = 'log';
            if (type === 'success') className = 'success';
            if (type === 'warning') className = 'warning';
            if (type === 'danger') className = 'danger';

            var timestamp = new Date().toTimeString().split(' ')[0];
            $screen.append('<div class="terminal-line ' + className + '"><span class="terminal-time">[' + timestamp + ']</span>' + text + '</div>');
            $screen.scrollTop($screen[0].scrollHeight);
        }

        // 清理缓存
        $('#clearCacheBtn').on('click', function(){
            var $btn = $(this);
            $btn.prop('disabled', true).text('清理中...');
            logToTerminal('Initiating cache wipe sequence...', 'warning');
            
            $.getJSON('./status.php?action=clear_cache', function(res){
                if(res.success) {
                    logToTerminal('All cache directories cleared successfully (retaining status lock).', 'success');
                    fetchCacheStats();
                } else {
                    logToTerminal('Error occurred during cache clearing routine.', 'danger');
                }
                $btn.prop('disabled', false).text('一键清理');
            });
        });

        // 一键预热缓存
        $('#warmupCacheBtn').on('click', function(){
            var $btn = $(this);
            $btn.prop('disabled', true).text('预热中...');
            logToTerminal('Launching SCM cache pre-warm pipeline...', 'log');
            logToTerminal('Sending cache requests for homepage & categories...', 'log');
            
            $.getJSON('./status.php?action=warmup_cache', function(res){
                if(res.success) {
                    res.logs.forEach(function(lg){
                        logToTerminal('-> ' + lg.name + ': ' + lg.message, lg.success ? 'success' : 'danger');
                    });
                    logToTerminal('All core caches pre-warmed successfully. Zero-latency active!', 'success');
                    fetchCacheStats();
                } else {
                    logToTerminal('Cache warmup pipeline encountered fatal errors.', 'danger');
                }
                $btn.prop('disabled', false).text('一键预热');
            }).fail(function(){
                logToTerminal('Cache warmup pipeline failed to respond.', 'danger');
                $btn.prop('disabled', false).text('一键预热');
            });
        });

        // 一键诊断 API
        $('#runDiagnosticBtn').on('click', function(){
            var $btn = $(this);
            $btn.prop('disabled', true).text('诊断中...');
            $('#radarSummary').text('并发探测中...');
            
            logToTerminal('Launching SCM concurrent pipeline radar...', 'log');
            logToTerminal('Spawning parallel network fetch processes (4s threshold)...', 'log');

            // 临时将所有指示点调成呼吸黄色闪烁，代表探测中
            $('.node-status-dot').removeClass('online offline slow').addClass('slow');

            $.getJSON('./status.php?action=diagnostic', function(res){
                if (res.success) {
                    logToTerminal('Diagnostics pipeline completed. Raw results aggregated.', 'success');
                    $('#radarSummary').text('上次诊断: ' + res.last_updated.split(' ')[1]);
                    
                    // 重新渲染雷达列表
                    var html = '';
                    var onlineCount = 0;
                    res.results.forEach(function(node){
                        var statusClass = 'offline';
                        var badgeClass = 'timeout';
                        var badgeText = 'FAIL';
                        
                        if (node.status === 'Online') {
                            statusClass = 'online';
                            onlineCount++;
                            if (node.latency < 300) {
                                badgeClass = 'fast';
                                badgeText = node.latency + 'ms';
                            } else {
                                badgeClass = 'mid';
                                badgeText = node.latency + 'ms';
                            }
                            logToTerminal('Connection verified: ' + node.name + ' (' + node.latency + 'ms) - Healthy.', 'success');
                        } else {
                            logToTerminal('Node offline or connection timed out: ' + node.name + ' - ' + node.health, 'danger');
                        }

                        var displayHost = node.host || node.url;
                        html += '<div class="radar-node" data-url="' + escapeHtml(node.url) + '">';
                        html += '  <span class="node-status-dot ' + statusClass + '"></span>';
                        html += '  <div class="node-info">';
                        html += '    <div class="node-name">' + escapeHtml(node.name) + '</div>';
                        html += '    <div class="node-url">' + escapeHtml(displayHost) + '</div>';
                        html += '  </div>';
                        html += '  <span class="node-badge ' + badgeClass + '">' + badgeText + '</span>';
                        html += '  <div class="node-actions">';
                        html += '    <span class="action-icon edit-node-btn" title="编辑链接">✏️</span>';
                        html += '    <span class="action-icon delete-action delete-node-btn" title="删除采集源">❌</span>';
                        html += '  </div>';
                        html += '</div>';
                    });
                    
                    $('#radarGrid').html(html);
                    initDragAndDrop();
                    logToTerminal('Diagnostic radar completed. Status: ' + onlineCount + '/' + res.results.length + ' online nodes.', 'success');
                } else {
                    logToTerminal('Diagnostics error: failed to resolve concurrent handles.', 'danger');
                    $('#radarSummary').text('诊断失败');
                }
                $btn.prop('disabled', false).text('诊断 API');
            }).fail(function(){
                logToTerminal('Diagnostics pipeline failed to respond.', 'danger');
                $('#radarSummary').text('探测超时');
                $btn.prop('disabled', false).text('诊断 API');
            });
        });

        // ================= 数据源动态配置与管理 =================
        var $modal = $('#sourceModal');
        var $urlInput = $('#sourceUrlInput');
        var $origInput = $('#editOriginalUrl');
        var $modalTitle = $('#modalTitle');

        // 打开 Modal - 新增
        $('#addSourceBtn').on('click', function(){
            $modalTitle.text('新增采集数据源');
            $urlInput.val('');
            $origInput.val('');
            $modal.addClass('active');
            $urlInput.focus();
        });

        // 打开 Modal - 编辑 (事件委派)
        $(document).on('click', '.edit-node-btn', function(){
            var $node = $(this).closest('.radar-node');
            var url = $node.attr('data-url') || '';
            $modalTitle.text('配置采集数据源');
            $urlInput.val(url);
            $origInput.val(url);
            $modal.addClass('active');
            $urlInput.focus();
        });

        // 关闭 Modal
        $('#closeModalBtn, #cancelModalBtn').on('click', function(){
            $modal.removeClass('active');
        });

        // 获取当前界面上的所有 URL 数组
        function getExistingUrls() {
            var urls = [];
            $('.radar-node').each(function(){
                var u = $(this).attr('data-url');
                if (u) urls.push(u);
            });
            return urls;
        }

        // 保存新增/修改
        $('#saveModalBtn').on('click', function(){
            var url = $.trim($urlInput.val());
            var origUrl = $origInput.val();
            
            if (!url) {
                alert('请输入有效的数据源链接');
                return;
            }
            if (!/^https?:\/\/.+/i.test(url)) {
                alert('数据源链接必须以 http:// 或 https:// 开头');
                return;
            }

            var urls = getExistingUrls();
            if (origUrl) {
                // 编辑模式
                var idx = urls.indexOf(origUrl);
                var dupIdx = urls.indexOf(url);
                if (dupIdx !== -1 && dupIdx !== idx) {
                    alert('该数据源链接在其它节点已存在，无需重复设置');
                    return;
                }
                if (idx !== -1) {
                    urls[idx] = url;
                } else {
                    urls.push(url);
                }
                logToTerminal('Updating SCM API source config...', 'log');
            } else {
                // 新增模式
                if (urls.indexOf(url) !== -1) {
                    alert('该数据源已存在，无需重复添加');
                    return;
                }
                urls.push(url);
                logToTerminal('Adding new SCM API source to registry...', 'log');
            }

            saveSourcesToServer(urls, function(){
                $modal.removeClass('active');
                logToTerminal('SCM config saved. Triggering automatic diagnostic radar...', 'success');
                $('#runDiagnosticBtn').trigger('click');
            });
        });

        // 提交配置数据到后端
        function saveSourcesToServer(urls, callback) {
            $.ajax({
                url: './status.php?action=save_sources',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ sources: urls }),
                dataType: 'json',
                success: function(res) {
                    if (res.success) {
                        if (callback) callback();
                    } else {
                        logToTerminal('Config writer error: ' + (res.message || 'Unknown error'), 'danger');
                        alert(res.message || '保存失败');
                    }
                },
                error: function() {
                    logToTerminal('Network exception during config save routine.', 'danger');
                    alert('保存遇到网络异常');
                }
            });
        }



        // 删除采集源 (事件委派)
        $(document).on('click', '.delete-node-btn', function(e){
            e.stopPropagation();
            var $node = $(this).closest('.radar-node');
            var url = $node.attr('data-url') || '';
            var name = $node.find('.node-name').text();
            
            if (confirm('确认删除采集源 [' + name + '] 吗？\n删除后系统将不再并发抓取或检索该源。')) {
                var urls = getExistingUrls();
                var idx = urls.indexOf(url);
                if (idx !== -1) {
                    if (urls.length <= 1) {
                        alert('必须保留至少一个有效的采集源，禁止清空');
                        logToTerminal('Action blocked: SCM registry requires at least 1 active source.', 'warning');
                        return;
                    }
                    urls.splice(idx, 1);
                    logToTerminal('Wiping source [' + name + '] from SCM registry...', 'warning');
                    saveSourcesToServer(urls, function(){
                        logToTerminal('Source node successfully deregistered. Re-ordering list...', 'success');
                        $('#runDiagnosticBtn').trigger('click');
                    });
                }
            }
        });

        function escapeHtml(text) {
            if (!text) return '';
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        <?php if (!$history_status): ?>
        // 首次加载/无缓存时，自动执行健康诊断以激活测速并生成缓存
        logToTerminal('No cache detected. Spawning automatic diagnostic sweep...', 'warning');
        $('#runDiagnosticBtn').trigger('click');
        <?php endif; ?>
    });
    </script>
<?php endif; ?>

</body>
</html>
