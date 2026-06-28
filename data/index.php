<?php

/*****
 ** CMS资源采集脚本 (偏重于量子资源网的多源采集)
 *
 *****/

// 引入 SQLite 数据库封装层与发信层
require_once dirname(__FILE__) . '/db.php';
require_once dirname(__FILE__) . '/mail.php';

// 开启会话管理
if (session_status() === PHP_SESSION_NONE) {
    // 限制 Cookie 的作用域与安全性
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

/***** ⬇配置⬇ *****/

// 动态载入采集源配置，如不存在或非数组则自动恢复默认配置
$sources_file = dirname(__FILE__) . '/sources.php';
$cms_api_list = null;
if (file_exists($sources_file)) {
    $cms_api_list = include $sources_file;
}
if (is_array($cms_api_list)) {
    $cms_api_list = array_values(array_unique($cms_api_list));
}
if (!is_array($cms_api_list) || empty($cms_api_list)) {
    $cms_api_list = array(
        'http://cj.lziapi.com/api.php/provide/vod/',
        'https://api.xinlangapi.com/xinlangapi.php/provide/vod/',
        'http://api.apibdzy.com/api.php/provide/vod/',
        'https://caiji.moduapi.cc/api.php/provide/vod/',
        'http://api.haiwaikan.com/api.php/provide/vod/',
        'https://api.tiankongapi.com/api.php/provide/vod/',
        'https://360zy.com/api.php/provide/vod/',
        'https://ikunzyapi.com/api.php/provide/vod/',
        'https://api.ffzyapi.com/api.php/provide/vod/',
        'https://api.guangsuapi.com/api.php/provide/vod/',
        'https://suoniapi.com/api.php/provide/vod/',
    );
    @file_put_contents($sources_file, "<?php\nreturn " . var_export($cms_api_list, true) . ";\n");
}

// 分类关键词映射 (用于动态匹配不同源的 type_id)
// 分类关键词映射 (用于动态匹配不同源的 type_id)
$cms_type_keywords = array(
    'dianying' => array('电影', '动作', '喜剧', '爱情', '科幻', '恐怖', '剧情', '战争', '惊悚', '悬疑', '犯罪', '纪录'),
    'dianshi'  => array('国产剧', '国产', '大陆剧', '电视剧', '香港剧', '韩国剧', '欧美剧', '台湾剧', '日本剧', '海外剧', '泰剧'),
    'zongyi'   => array('综艺', '大陆综艺', '港台综艺', '日韩综艺', '欧美综艺'),
    'dongman'  => array('动漫', '国产动漫', '日韩动漫', '欧美动漫', '动画'),
);

// 获取资源站的友好中文名称
function cms_get_source_name($url)
{
    $host = parse_url($url, PHP_URL_HOST);
    if (empty($host)) return '线路';
    
    $mapping = array(
        '360zy.com' => '360资源',
        'xinlangapi.com' => '新浪资源',
        'lziapi.com' => '量子资源',
        'suoniapi.com' => '索尼资源',
        'zuidapi.com' => '最大资源',
        'wujinapi.me' => '无尽资源',
        'guangsuapi.com' => '光速资源',
        'subocaiji.com' => '速播资源',
        'suboziyuan.net' => '速播资源',
        'jyzyapi.com' => '金鹰资源',
        'hongniuzy2.com' => '红牛资源',
        'hhzyapi.com' => '豪华资源',
        'huyaapi.com' => '虎牙资源',
        'jszyapi.com' => '极速资源',
        'ffzyapi.com' => '非凡资源',
        '1080zyku.com' => '1080资源',
        'yzzy-api.com' => '优质资源',
        'mdzyapi.com' => '魔都资源',
        'rycjapi.com' => '如意资源',
        'ryzyw.com' => '如意资源',
        'ikeunzyapi.com' => 'iKun资源',
        'wyvod.com' => '无忧资源',
        'ckzy.me' => 'CK资源',
        'lovedan.net' => '艾旦资源',
        'ddmf.net' => '蛋蛋资源',
        'apibdzy.com' => '百度资源',
        'dyttzyapi.com' => '天堂资源',
        '118318.xyz' => '快龙资源',
        'maoyanapi.top' => '猫眼资源',
        'p2100.net' => '飘零资源',
    );
    
    foreach ($mapping as $key => $name) {
        if (strpos($host, $key) !== false) {
            return $name;
        }
    }
    
    return str_replace('api.', '', $host);
}

// 智能获取延迟最低的健康的在线源列表 (用于前台线路导航)
function cms_get_active_sources($limit = 6)
{
    global $cms_api_list;
    
    // 尝试从 SQLite 的监控结果表中读出健康的源
    $db_sources = db_source_list(3600);
    $active = array();
    
    if ($db_sources) {
        // 先收集所有在线的 api_url
        $online_urls = array();
        foreach ($db_sources as $s) {
            if ($s['is_online']) {
                $online_urls[] = $s['api_url'];
            }
        }

        // 按照全局 $cms_api_list 的物理排序（后端拉取配置）提取在线源
        foreach ($cms_api_list as $idx => $api_url) {
            if (in_array($api_url, $online_urls)) {
                $active[] = array(
                    'idx'  => $idx,
                    'name' => cms_get_source_name($api_url),
                    'url'  => $api_url
                );
            }
            if (count($active) >= $limit) break;
        }
    }
    
    // 兜底：如果数据库为空或在线源不足，直接按顺序取配置文件里的前几个源
    if (count($active) < 3) {
        $active = array();
        $cnt = 0;
        foreach ($cms_api_list as $idx => $api_url) {
            $active[] = array(
                'idx'  => $idx,
                'name' => cms_get_source_name($api_url),
                'url'  => $api_url
            );
            $cnt++;
            if ($cnt >= $limit) break;
        }
    }
    
    return $active;
}

// 缓存过期时长(秒)
$data_cache_expire = 60 * 30; // 半小时

// 缓存目录cache(需要有读写权限)
$data_cache_dir = dirname(__FILE__) . '/../cache/' . date('Ymd') . '/';

/***** ⬆配置⬆ *****/

ignore_user_abort(true);

if (!empty($_GET['random'])) {

    if (empty($_GET['callback'])) {
        die();
    } else {
        echo data($_GET['random'], true);
    }
}

/**
 * 数据入口
 *
 * @param string|array  $random  请求参数 (JSON数组或JSON字符串)
 * @param boolean       $return_json  是否返回JSONP
 *
 * @return array|string
 */
function data($random, $return_json = false)
{
    if ($return_json === true) {
        $cache_key = $random;
    } else {
        $cache_key = is_string($random) ? $random : json_encode($random);
    }

    $data = data_cache_get($cache_key, $return_json);
    if ($data === false) {

        if ($return_json === true) {
            $params = json_decode($random, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                // 如果前端开启了混淆，通过解码器还原
                $params = modifier_decode($random);
            }
        } else {
            $params = is_string($random) ? json_decode($random, true) : $random;
        }

        $data = cms_data_fetch($params);
        if ($data !== false) {
            data_cache_set($cache_key, $return_json, $data);
        }
    }

    if ($return_json === true) {
        header('Content-Type: application/javascript; charset=utf-8');
        $callback = isset($_GET['callback']) ? $_GET['callback'] : '';
        if (!preg_match('/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/', $callback)) {
            die('/* invalid callback */');
        }
        // 输出内容使用 modifier_encode 混淆以向下兼容原本的 $.getJS 解密
        $raw_str = json_encode($data);
        $encrypted_str = modifier_encode($raw_str);
        echo $callback . '(' . json_encode($encrypted_str) . ')';
        die();
    } else {
        return $data;
    }
}

/**
 * 根据分类关键词动态解析某个源的 type_id
 *
 * @param string $api_url   源 API 地址
 * @param string $category  分类 (dianying/dianshi/zongyi/dongman)
 * @param int    $fallback  兜底 type_id
 *
 * @return int
 */
function cms_resolve_type_id($api_url, $category, $fallback = 1)
{
    global $cms_type_keywords;

    $cache_key = 'typeid_' . md5($api_url . '_' . $category);
    $cached = db_cache_get($cache_key);
    if ($cached !== false && isset($cached['type_id'])) {
        return $cached['type_id'];
    }

    // 请求 ac=list 获取源站完整的分类树来进行精准大类判定
    $url = $api_url . '?' . http_build_query(array('ac' => 'list'));
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ));
    $response = curl_exec($ch);
    @curl_close($ch);

    if (empty($response)) return $fallback;

    $data = json_decode($response, true);
    if (!$data || empty($data['class'])) return $fallback;

    $keywords = isset($cms_type_keywords[$category]) ? $cms_type_keywords[$category] : array();

    // 1. 定位一级大类 ID (type_pid == 0)
    $parent_id = 0;
    foreach ($data['class'] as $item) {
        $pid = $item['type_pid'] ?? -1;
        if ($pid !== 0) continue;
        $tname = $item['type_name'] ?? '';
        foreach ($keywords as $kw) {
            if (mb_stripos($tname, $kw) !== false) {
                $parent_id = $item['type_id'];
                break 2;
            }
        }
    }

    // 2. 匹配该大类下对应的子分类
    $best_id = $fallback;
    $best_score = -1;
    foreach ($data['class'] as $item) {
        $tid = $item['type_id'] ?? 0;
        $tname = trim($item['type_name'] ?? '');
        $pid = $item['type_pid'] ?? 0;
        if (!$tid || !$tname) continue;

        // 如果有一级大类 ID，限制子类的 type_pid 必须对应
        if ($parent_id > 0) {
            if ($pid !== $parent_id) continue;
        } else {
            // 兜底硬性文字隔离：防止大类匹配串行
            if ($category === 'dianying' && (mb_strpos($tname, '剧') !== false || mb_strpos($tname, '动漫') !== false || mb_strpos($tname, '综艺') !== false)) continue;
            if ($category === 'dianshi' && (mb_strpos($tname, '片') !== false || mb_strpos($tname, '动漫') !== false || mb_strpos($tname, '综艺') !== false)) continue;
            if ($category === 'zongyi' && mb_strpos($tname, '综艺') === false) continue;
            if ($category === 'dongman' && (mb_strpos($tname, '动漫') === false && mb_strpos($tname, '动画') === false)) continue;
        }

        $score = 0;
        foreach ($keywords as $kw) {
            if (mb_stripos($tname, $kw) !== false) {
                $score += 10;
            }
        }
        if ($score > $best_score && $score > 0) {
            $best_score = $score;
            $best_id = $tid;
        }
    }

    db_cache_set($cache_key, array('type_id' => $best_id), 86400 * 7);
    return $best_id;
}

/**
 * 根据子分类名称动态解析某个源的 type_id
 *
 * @param string $api_url       源 API 地址
 * @param string $category      父分类 (dianying/dianshi/zongyi/dongman)
 * @param string $sub_name      子分类名称 (如 "韩国剧")
 * @param int    $fallback      兜底 type_id
 *
 * @return int
 */
function cms_resolve_sub_type_id($api_url, $category, $sub_name, $fallback = 0)
{
    $cache_key = 'subtypeid_' . md5($api_url . '_' . $category . '_' . $sub_name);
    $cached = db_cache_get($cache_key);
    if ($cached !== false && isset($cached['type_id'])) {
        return $cached['type_id'];
    }

    // 请求 ac=list 获取完整的分类树来进行精准子分类判定，解决时效性导致的无法匹配欧美剧等问题
    $url = $api_url . '?' . http_build_query(array('ac' => 'list'));
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ));
    $response = curl_exec($ch);
    @curl_close($ch);

    if (empty($response)) return $fallback;

    $data = json_decode($response, true);
    if (!$data || empty($data['class'])) return $fallback;

    // 先拿到父分类的一级大类 ID (用于防交叉匹配)
    global $cms_type_keywords;
    $parent_keywords = isset($cms_type_keywords[$category]) ? $cms_type_keywords[$category] : array();
    $parent_id = 0;
    foreach ($data['class'] as $item) {
        $pid = $item['type_pid'] ?? -1;
        if ($pid !== 0) continue;
        $tname = $item['type_name'] ?? '';
        foreach ($parent_keywords as $kw) {
            if (mb_stripos($tname, $kw) !== false) {
                $parent_id = $item['type_id'];
                break 2;
            }
        }
    }

    $best_id = $fallback;
    foreach ($data['class'] as $item) {
        $tname = trim($item['type_name'] ?? '');
        $pid = $item['type_pid'] ?? 0;
        if (empty($tname)) continue;

        // 如果存在一级大类，子类必须属于它
        if ($parent_id > 0) {
            if ($pid !== $parent_id) continue;
        } else {
            // 兜底防错隔离
            if ($category === 'dianying' && (mb_strpos($tname, '剧') !== false || mb_strpos($tname, '动漫') !== false || mb_strpos($tname, '综艺') !== false)) continue;
            if ($category === 'dianshi' && (mb_strpos($tname, '片') !== false || mb_strpos($tname, '动漫') !== false || mb_strpos($tname, '综艺') !== false)) continue;
            if ($category === 'zongyi' && mb_strpos($tname, '综艺') === false) continue;
            if ($category === 'dongman' && (mb_strpos($tname, '动漫') === false && mb_strpos($tname, '动画') === false)) continue;
        }

        // 清洗常见后缀词，提高语义模糊匹配率（例如使 "韩国剧" 与 "韩剧"、"动作片" 与 "动作" 能自动互认）
        $tname_clean = preg_replace('/(片|剧|剧集|动漫|动画|综艺)/u', '', $tname);
        $sub_clean   = preg_replace('/(片|剧|剧集|动漫|动画|综艺)/u', '', $sub_name);

        if ($tname === $sub_name || 
            mb_stripos($tname, $sub_name) !== false || 
            mb_stripos($sub_name, $tname) !== false ||
            (!empty($tname_clean) && !empty($sub_clean) && (
                mb_stripos($tname_clean, $sub_clean) !== false ||
                mb_stripos($sub_clean, $tname_clean) !== false
            ))
        ) {
            $best_id = $item['type_id'];
            break;
        }
    }

    db_cache_set($cache_key, array('type_id' => $best_id), 86400 * 7);

    return $best_id;
}

/**
 * CMS API 请求封装
 *
 * @param array $params  请求参数
 *
 * @return array|null
 */
function cms_api_request($params)
{
    global $cms_api_list;

    $category = isset($params['category']) ? $params['category'] : '';
    $sub_category = isset($params['sub_category']) ? $params['sub_category'] : '';
    $requested_type = isset($params['t']) ? intval($params['t']) : 0;
    unset($params['category']);
    unset($params['sub_category']);

    $source_idx = isset($params['source_idx']) ? intval($params['source_idx']) : null;
    unset($params['source_idx']);

    if (isset($params['ids'])) {
        $id_arr = explode(',', $params['ids']);
        $cleaned_ids = array();
        foreach ($id_arr as $id_val) {
            $id_val = trim($id_val);
            if (strpos($id_val, '_') !== false) {
                list($idx, $real_id) = explode('_', $id_val, 2);
                if ($source_idx === null) {
                    $source_idx = intval($idx);
                }
                $cleaned_ids[] = $real_id;
            } else {
                $cleaned_ids[] = $id_val;
            }
        }
        if ($source_idx !== null) {
            $params['ids'] = implode(',', $cleaned_ids);
        }
    }

    // 如果指定了具体的源索引，直接且仅请求该源
    if ($source_idx !== null && isset($cms_api_list[$source_idx])) {
        $api_url = $cms_api_list[$source_idx];
        $req_params = $params;
        if (!empty($sub_category)) {
            $sub_tid = cms_resolve_sub_type_id($api_url, $category, $sub_category, 0);
            if ($sub_tid > 0) {
                $req_params['t'] = $sub_tid;
            } elseif (!empty($category) && isset($req_params['t'])) {
                $req_params['t'] = cms_resolve_type_id($api_url, $category, $requested_type);
            }
        } elseif (!empty($category) && isset($req_params['t'])) {
            $req_params['t'] = cms_resolve_type_id($api_url, $category, $requested_type);
        }
        $query = http_build_query($req_params);
        $url = $api_url . '?' . $query;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Accept: application/json',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ));

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($http_code === 200 && !empty($response)) {
            $data = json_decode($response, true);
            if (isset($data['code']) && $data['code'] == 1) {
                // 重写返回的 vod_id，加上实际请求成功的源索引前缀
                if (!empty($data['list']) && is_array($data['list'])) {
                    foreach ($data['list'] as &$vod) {
                        if (isset($vod['vod_id'])) {
                            $vod['vod_id'] = $source_idx . '_' . $vod['vod_id'];
                        }
                    }
                }
                return $data;
            }
        }
        return null;
    }

    // 根据监控结果，重排轮询顺序 (优先只轮询在线且延迟低的源站，保障即使默认线路故障也能秒级自动切入健康源)
    $db_sources = db_source_list(3600);
    $sorted_list = array();
    if ($db_sources) {
        foreach ($db_sources as $s) {
            if ($s['is_online']) {
                $found_idx = array_search($s['api_url'], $cms_api_list);
                if ($found_idx !== false) {
                    $sorted_list[$found_idx] = $s['api_url'];
                }
            }
        }
    }
    // 补齐其余未测速或离线的源
    foreach ($cms_api_list as $idx => $api_url) {
        if (!isset($sorted_list[$idx])) {
            $sorted_list[$idx] = $api_url;
        }
    }

    foreach ($sorted_list as $idx => $api_url) {
        $req_params = $params;
        if (!empty($sub_category)) {
            $sub_tid = cms_resolve_sub_type_id($api_url, $category, $sub_category, 0);
            if ($sub_tid > 0) {
                $req_params['t'] = $sub_tid;
            } elseif (!empty($category) && isset($req_params['t'])) {
                $req_params['t'] = cms_resolve_type_id($api_url, $category, $requested_type);
            }
        } elseif (!empty($category) && isset($req_params['t'])) {
            $req_params['t'] = cms_resolve_type_id($api_url, $category, $requested_type);
        }
        $query = http_build_query($req_params);
        $url = $api_url . '?' . $query;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Accept: application/json',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ));

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($http_code === 200 && !empty($response)) {
            $data = json_decode($response, true);
            if (isset($data['code']) && $data['code'] == 1) {
                // 重写返回的 vod_id，加上实际请求成功的源索引前缀
                if (!empty($data['list']) && is_array($data['list'])) {
                    foreach ($data['list'] as &$vod) {
                        if (isset($vod['vod_id'])) {
                            $vod['vod_id'] = $idx . '_' . $vod['vod_id'];
                        }
                    }
                }
                return $data;
            }
        }
    }

    return null;
}

/**
 * 格式化视频封面地址，中转豆瓣等防盗链图片
 *
 * @param string $url  原图地址
 *
 * @return string
 */
function cms_format_pic($url)
{
    if (empty($url)) {
        return '';
    }

    // 将已封禁的量子图片域名统一热替换为最新的官方镜像 img.liangzipic.com (国内网络可直连秒开)
    if (strpos($url, 'img.lzipic.com') !== false) {
        $url = str_replace('img.lzipic.com', 'img.liangzipic.com', $url);
    }
    if (strpos($url, 'img.lzzyimg.com') !== false) {
        $url = str_replace('img.lzzyimg.com', 'img.liangzipic.com', $url);
    }

    // 如果是豆瓣防盗链图片，利用本地代理 pic.php 进行防盗链中转
    if (strpos($url, 'doubanio.com') !== false || strpos($url, 'douban.com') !== false) {
        return '/data/pic.php?url=' . urlencode($url);
    }

    return $url;
}

/**
 * 深度清洗简介文本，消除 HTML 实体垃圾字符及乱码 (如 &amp;;)
 *
 * @param string $desc  原简介
 *
 * @return string
 */
function cms_clean_desc($desc)
{
    if (empty($desc)) {
        return '';
    }
    $desc = strip_tags($desc);
    
    // 预处理常见的乱码前缀和双重转义，防止解码后产生残留
    $desc = str_replace(array('&amp;amp;;', '&amp;;', '&amp;amp;', '&amp;'), array('', '', '', ''), $desc);
    
    // 多次解码以防嵌套实体
    for ($i = 0; $i < 3; $i++) {
        $desc = html_entity_decode($desc, ENT_QUOTES, 'UTF-8');
    }
    
    // 强制替换掉其他多余的实体符号
    $desc = str_replace(array('&nbsp;', '&;', '&amp;'), array(' ', '', ''), $desc);
    
    // 正则过滤掉所有未被成功解码的实体字符 (例如像 &#123; 或者是 &ldquo; 残留)
    $desc = preg_replace('/&[a-zA-Z0-9#]+;/', '', $desc);
    
    // 清洗多重分号及异常尾部符号 (源站多次损坏实体解码后残留的垃圾符号)
    $desc = preg_replace('/;{2,}/', '', $desc);
    $desc = preg_replace('/；{2,}/', '', $desc);
    $desc = preg_replace('/[;；\s]+$/', '', $desc);
    
    return trim($desc);
}

/**
 * CMS视频列表数据格式化
 *
 * @param array $list  CMS API返回的list
 *
 * @return array
 */
function cms_format_list($list)
{
    $result = array();
    foreach ($list as $v) {
        $desc = isset($v['vod_blurb']) ? $v['vod_blurb'] : '';
        if (empty($desc) && isset($v['vod_content'])) {
            $desc = mb_strimwidth($v['vod_content'], 0, 150, '...');
        }
        $desc = cms_clean_desc($desc);
        $result[] = array(
            'id'    => $v['vod_id'] ?? '0',
            'title' => $v['vod_name'] ?? '无标题',
            'pic'   => cms_format_pic($v['vod_pic'] ?? ''),
            'hint'  => isset($v['vod_remarks']) ? $v['vod_remarks'] : '',
            'year'  => isset($v['vod_year']) ? $v['vod_year'] : '',
            'type'  => isset($v['type_name']) ? $v['type_name'] : '',
            'desc'  => $desc,
        );
    }
    return $result;
}

/**
 * CMS视频详情数据格式化 (前端item页面所需格式)
 *
 * from格式: [ [url, episode_list, site_name], ... ]
 *
 * @param array $vod  CMS API返回的单个视频数据
 *
 * @return array
 */
function cms_format_item($vod)
{
    $from = array();
    $episodes = array();
    $hasmore = 0;

    $play_from = isset($vod['vod_play_from']) ? $vod['vod_play_from'] : '';
    $play_url = isset($vod['vod_play_url']) ? $vod['vod_play_url'] : '';

    $display_names = array(
        'lzm3u8' => '量子M3U8',
        'liangzi' => '量子云播',
        'ffm3u8' => '非凡M3U8',
        'feifan' => '非凡云播',
        'kuyun' => '酷云播',
        'kym3u8' => '酷云M3U8',
        'zuidam3u8' => '最大M3U8',
        'zuida' => '最大云播',
        'xinlang' => '新浪云播',
        'xlyun' => '新浪云播',
        'xlm3u8' => '新浪M3U8',
        'baidu' => '百度云播',
        'bdzy' => '百度资源',
        'dbm3u8' => '百度M3U8',
        'modu' => '魔都云播',
        'modum3u8' => '魔都M3U8',
        'haiwaikan' => '海外资源',
        'hwk' => '海外M3U8',
        'tiankong' => '天空云播',
        'tkm3u8' => '天空M3U8',
        '360zy' => '360云播',
        '360m3u8' => '360M3U8',
        'ikm3u8' => 'iKunM3U8',
        'gsyun' => '光速云播',
        'gsm3u8' => '光速M3U8',
        'wjm3u8' => '无尽M3U8',
        'wujin' => '无尽云播',
        'kcm3u8' => '快车M3U8',
        'kuaiche' => '快车云播',
        'okm3u8' => 'OK_M3U8',
        'okyun' => 'OK云播',
        'jinyingm3u8' => '金鹰M3U8',
        'jinying' => '金鹰云播',
        'sdm3u8' => '闪电M3U8',
        'shandian' => '闪电云播',
        'hnm3u8' => '红牛M3U8',
        'hongniu' => '红牛云播',
        'hnyun' => '红牛云播',
        'subm3u8' => '速播M3U8',
        'subyun' => '速播云播',
        'hhm3u8' => '豪华M3U8',
        'hhyun' => '豪华云播',
        'hyyun' => '虎牙云播',
        'hym3u8' => '虎牙M3U8',
        'jsyun' => '极速云播',
        'jsm3u8' => '极速M3U8',
        'snm3u8' => '索尼M3U8',
        'suoni' => '索尼云播',
        'rym3u8' => '如意M3U8',
        'ruyi' => '如意资源',
        '1080zyk' => '1080资源',
        '1080m3u8' => '1080_M3U8',
        'yzym3u8' => '优质M3U8',
        'yzzy' => '优质云播',
        'feifei' => '飞飞云播',
        'ckm3u8' => 'CK_M3U8',
        'ckzy' => 'CK资源',
    );

    if (!empty($play_from) && !empty($play_url)) {
        $sources = explode('$$$', $play_from);
        $url_groups = explode('$$$', $play_url);

        foreach ($sources as $idx => $source_name) {
            if (!isset($url_groups[$idx])) continue;

            $source_name = trim($source_name);
            if (isset($display_names[$source_name])) {
                $source_name = $display_names[$source_name];
            }

            $episodes_str = $url_groups[$idx];
            $ep_list = array();

            $episodes_arr = explode('#', $episodes_str);
            foreach ($episodes_arr as $ep) {
                $parts = explode('$', $ep, 2);
                if (count($parts) === 2) {
                    $ep_list[$parts[0]] = $parts[1];
                }
            }

            if (!empty($ep_list)) {
                $episodes[$source_name] = $ep_list;
                $first_url = reset($ep_list);
                $from[] = array($first_url, json_encode($ep_list), $source_name);
                if (count($ep_list) > 1) {
                    $hasmore = 1;
                }
            }
        }
    }

    $desc = isset($vod['vod_blurb']) ? $vod['vod_blurb'] : '';
    if (empty($desc) && isset($vod['vod_content'])) {
        $desc = $vod['vod_content'];
    }
    $desc = cms_clean_desc($desc);

    return array(
        'title'   => $vod['vod_name'] ?? '无标题',
        'pic'     => cms_format_pic($vod['vod_pic'] ?? ''),
        'desc'    => $desc,
        'from'    => $from,
        'hasmore' => $hasmore,
        'episodes'=> $episodes,
        'item'    => array_keys($episodes),
        'guess'   => array(),
    );
}

/**
 * 获取随机推荐 (用于猜你喜欢)
 *
 * @param int $type_id  类型ID
 * @param int $count    数量
 *
 * @return array
 */
function cms_get_guess($type_id, $count = 8)
{
    $result = cms_api_request(array(
        'ac' => 'detail',
        't'  => $type_id,
        'pg' => rand(1, 5),
    ));

    if ($result && !empty($result['list'])) {
        $list = cms_format_list($result['list']);
        shuffle($list);
        return array_slice($list, 0, $count);
    }

    return array();
}

/**
 * 校验二级分类名称是否属于指定的父分类
 *
 * @param string $type_name    二级分类名称
 * @param string $parent_type  父分类标识 (dianying/dianshi/zongyi/dongman)
 * @return bool
 */
function cms_is_type_match($type_name, $parent_type)
{
    $type_name = mb_strtolower($type_name);
    
    // 1. 如果包含其他分类的标志性硬关键词，直接排除，防止分类混淆
    if ($parent_type !== 'dianying' && (mb_strpos($type_name, '片') !== false || mb_strpos($type_name, '电影') !== false)) {
        return false;
    }
    if ($parent_type !== 'dianshi' && (mb_strpos($type_name, '剧') !== false || mb_strpos($type_name, '剧集') !== false)) {
        return false;
    }
    if ($parent_type !== 'zongyi' && mb_strpos($type_name, '综艺') !== false) {
        return false;
    }
    if ($parent_type !== 'dongman' && (mb_strpos($type_name, '动漫') !== false || mb_strpos($type_name, '动画') !== false)) {
        return false;
    }

    // 2. 根据大类特有特征进行快速匹配
    switch ($parent_type) {
        case 'dianying':
            if (mb_strpos($type_name, '片') !== false || mb_strpos($type_name, '电影') !== false || mb_strpos($type_name, '纪录') !== false) {
                return true;
            }
            break;
        case 'dianshi':
            if (mb_strpos($type_name, '剧') !== false || mb_strpos($type_name, '剧集') !== false) {
                return true;
            }
            break;
        case 'zongyi':
            if (mb_strpos($type_name, '综艺') !== false) {
                return true;
            }
            break;
        case 'dongman':
            if (mb_strpos($type_name, '动漫') !== false || mb_strpos($type_name, '动画') !== false) {
                return true;
            }
            break;
    }

    // 3. 兜底匹配：使用 $cms_type_keywords 关键词映射进行检索
    global $cms_type_keywords;
    $keywords = isset($cms_type_keywords[$parent_type]) ? $cms_type_keywords[$parent_type] : array();
    foreach ($keywords as $kw) {
        if (mb_strpos($type_name, $kw) !== false) {
            return true;
        }
    }

    return false;
}

/**
 * 动态获取子分类列表 (采用预设标准模板机制，免除网络探测耗时，保证类目全而美)
 *
 * @param string $type  父分类 (dianying/dianshi/zongyi/dongman)
 *
 * @return array  子分类名称列表
 */
function cms_get_filter($type)
{
    $filters = array(
        'dianying' => array('动作片', '喜剧片', '爱情片', '科幻片', '恐怖片', '剧情片', '战争片', '惊悚片', '悬疑片', '犯罪片', '纪录片', '伦理片', '短剧'),
        'dianshi'  => array('国产剧', '香港剧', '韩国剧', '欧美剧', '台湾剧', '日本剧', '海外剧', '泰国剧', '短剧'),
        'zongyi'   => array('大陆综艺', '港台综艺', '日韩综艺', '欧美综艺'),
        'dongman'  => array('国产动漫', '日韩动漫', '欧美动漫', '动画', 'AI漫剧')
    );

    return isset($filters[$type]) ? $filters[$type] : array();
}

/**
 * 数据采集主函数
 *
 * @param array $params  参数
 *
 * @return string|array|false
 */
function cms_data_fetch($params)
{
    if (empty($params) || !isset($params['act'])) {
        return false;
    }

    $act = $params['act'];

    switch ($act) {
        case 'index':
            return cms_fetch_index();

        case 'list':
            return cms_fetch_list($params);

        case 'search':
            return cms_fetch_search($params);

        case 'item':
            return cms_fetch_item($params);

        case 'send_code':
            return cms_user_send_code($params);

        case 'register':
            return cms_user_register($params);

        case 'login':
            return cms_user_login($params);

        case 'logout':
            return cms_user_logout();

        case 'user_info':
            return cms_user_info();

        case 'history_sync':
            return cms_user_history_sync($params);

        case 'favorite_toggle':
            return cms_user_favorite_toggle($params);

        case 'favorite_list':
            return cms_user_favorite_list();

        case 'favorite_check':
            return cms_user_favorite_check($params);

        default:
            return false;
    }
}

/**
 * 接口：发送邮箱验证码 (同 Session 60秒防刷限额，验证码10分钟有效)
 */
function cms_user_send_code($params)
{
    $email = isset($params['email']) ? trim($params['email']) : '';
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return array('code' => 0, 'msg' => '请输入合法的邮箱地址');
    }

    // 防刷限频限制 (60秒)
    $now = time();
    if (isset($_SESSION['last_code_time']) && ($now - $_SESSION['last_code_time']) < 60) {
        return array('code' => 0, 'msg' => '验证码发送频繁，请 ' . (60 - ($now - $_SESSION['last_code_time'])) . ' 秒后再试');
    }

    // 生成 6 位随机验证码
    $code = strval(rand(100000, 999999));
    
    // 发送 HTML 邮件
    $subject = '【Fate Video】验证您的邮箱验证码';
    $body = '
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Helvetica, Arial, sans-serif; background: #0f0f13; border: 1px solid #1a1a24; border-radius: 12px; color: #e6e6e6;">
        <h2 style="color: #6c5ce7; border-bottom: 2px solid #1a1a24; padding-bottom: 10px; margin-top: 0;">Fate Video 账号验证</h2>
        <p style="font-size: 15px; line-height: 1.6;">您好！</p>
        <p style="font-size: 15px; line-height: 1.6;">您正在申请注册或修改 Fate Video 账号。您的安全验证码如下，请在注册框中输入验证：</p>
        <div style="font-size: 32px; font-weight: bold; color: #ff7675; text-align: center; margin: 30px 0; letter-spacing: 5px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px dashed rgba(255,255,255,0.08);">' . $code . '</div>
        <p style="font-size: 13px; color: #8c8c9e; line-height: 1.6;">* 此验证码在 10 分钟内有效，过期后请重新获取。请勿将验证码泄露给他人。</p>
        <div style="border-top: 1px solid #1a1a24; padding-top: 15px; font-size: 12px; color: #5c5c6e; text-align: center; margin-top: 30px;">
            本邮件由 Fate Video 自动发送，请勿直接回复。
        </div>
    </div>';

    $res = cms_send_mail($email, $subject, $body);
    if ($res === true) {
        // 保存验证码到 SQLite，有效期 600 秒
        db_verification_set($email, $code, 600);
        $_SESSION['last_code_time'] = $now;
        return array('code' => 1, 'msg' => '验证码已成功发送至您的邮箱');
    } else {
        return array('code' => 0, 'msg' => '发信失败: ' . $res);
    }
}

/**
 * 接口：注册新用户
 */
function cms_user_register($params)
{
    $email    = isset($params['email']) ? trim($params['email']) : '';
    $password = isset($params['password']) ? trim($params['password']) : '';
    $nickname = isset($params['nickname']) ? trim($params['nickname']) : '';
    $code     = isset($params['code']) ? trim($params['code']) : '';

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return array('code' => 0, 'msg' => '邮箱格式不正确');
    }
    if (strlen($password) < 6) {
        return array('code' => 0, 'msg' => '密码长度不能少于 6 位');
    }
    if (empty($nickname)) {
        $nickname = explode('@', $email)[0]; // 默认取邮箱前缀作为昵称
    }
    if (empty($code)) {
        return array('code' => 0, 'msg' => '请输入验证码');
    }

    // 校验邮箱验证码
    if (!db_verification_verify($email, $code)) {
        return array('code' => 0, 'msg' => '验证码错误或已过期，请重新获取');
    }

    // 检查邮箱是否已被注册
    $exist = db_user_get_by_email($email);
    if ($exist) {
        return array('code' => 0, 'msg' => '该邮箱已被注册，请直接登录');
    }

    // 注册新用户
    $success = db_user_create($email, $password, $nickname);
    if ($success) {
        $user = db_user_get_by_email($email);
        if ($user) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_nickname'] = $user['nickname'];
            return array('code' => 1, 'msg' => '注册并登录成功', 'user' => $user);
        }
    }

    return array('code' => 0, 'msg' => '注册失败，请稍后重试');
}

/**
 * 接口：提交登录
 */
function cms_user_login($params)
{
    $email    = isset($params['email']) ? trim($params['email']) : '';
    $password = isset($params['password']) ? trim($params['password']) : '';

    if (empty($email) || empty($password)) {
        return array('code' => 0, 'msg' => '请输入邮箱和密码');
    }

    $user_id = db_user_verify_password($email, $password);
    if ($user_id !== false) {
        $user = db_user_get_by_email($email);
        if ($user) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_nickname'] = $user['nickname'];
            return array('code' => 1, 'msg' => '登录成功', 'user' => $user);
        }
    }

    return array('code' => 0, 'msg' => '邮箱或密码错误，请重新输入');
}

/**
 * 接口：登出会话
 */
function cms_user_logout()
{
    unset($_SESSION['user_id']);
    unset($_SESSION['user_email']);
    unset($_SESSION['user_nickname']);
    return array('code' => 1, 'msg' => '已成功退出登录');
}

/**
 * 接口：获取当前登录用户信息
 */
function cms_user_info()
{
    if (isset($_SESSION['user_id'])) {
        return array(
            'code' => 1,
            'user' => array(
                'id' => $_SESSION['user_id'],
                'email' => $_SESSION['user_email'],
                'nickname' => $_SESSION['user_nickname']
            )
        );
    }
    return array('code' => 0, 'msg' => '当前未登录');
}

/**
 * 接口：云同步播放历史
 */
function cms_user_history_sync($params)
{
    if (!isset($_SESSION['user_id'])) {
        return array('code' => 0, 'msg' => '请先登录账号');
    }
    $user_id = $_SESSION['user_id'];

    // 接收前台批量上传的历史纪录数据（JSON 格式字符串）
    $items_raw = isset($params['items']) ? $params['items'] : '';
    $items = array();
    if (!empty($items_raw)) {
        $items = is_string($items_raw) ? json_decode($items_raw, true) : $items_raw;
    }

    if (!empty($items) && is_array($items)) {
        db_history_sync($user_id, $items);
    }

    // 重新拉取最新的 30 条播放历史返回前台
    $latest = db_history_list($user_id, 30);
    return array('code' => 1, 'history' => $latest);
}

/**
 * 接口：切换影片收藏夹状态
 */
function cms_user_favorite_toggle($params)
{
    if (!isset($_SESSION['user_id'])) {
        return array('code' => 0, 'msg' => '请先登录账号');
    }
    $user_id = $_SESSION['user_id'];

    $vid   = isset($params['vid']) ? trim($params['vid']) : '';
    $title = isset($params['title']) ? trim($params['title']) : '';
    $pic   = isset($params['pic']) ? trim($params['pic']) : '';

    if (empty($vid)) {
        return array('code' => 0, 'msg' => '缺失影片 ID');
    }

    $res = db_favorite_toggle($user_id, $vid, $title, $pic);
    if ($res) {
        return array('code' => 1, 'action' => $res['action'], 'msg' => $res['action'] === 'add' ? '已成功加入追剧列表' : '已取消追剧');
    }

    return array('code' => 0, 'msg' => '操作失败');
}

/**
 * 接口：获取我的收藏列表
 */
function cms_user_favorite_list()
{
    if (!isset($_SESSION['user_id'])) {
        return array('code' => 0, 'msg' => '请先登录账号');
    }
    $user_id = $_SESSION['user_id'];

    $fav_list = db_favorite_list($user_id);
    return array('code' => 1, 'list' => $fav_list);
}

/**
 * 接口：确认单片是否已被收藏
 */
function cms_user_favorite_check($params)
{
    if (!isset($_SESSION['user_id'])) {
        return array('code' => 1, 'favorited' => false); // 未登录默认未收藏
    }
    $user_id = $_SESSION['user_id'];
    $vid = isset($params['vid']) ? trim($params['vid']) : '';

    $favorited = db_favorite_check($user_id, $vid);
    return array('code' => 1, 'favorited' => $favorited);
}

/**
 * 首页数据
 *
 * @return array
 */
function cms_fetch_index()
{
    $data = array(
        'banner'  => array(),
        'dianshi' => array(),
        'dianying'=> array(),
        'zongyi'  => array(),
        'dongman' => array(),
    );

    // 获取健康的在线源
    $active_sources = cms_get_active_sources(6);
    
    // 如果没有，直接用全局 $cms_api_list 兜底
    $source_indices = array();
    if (!empty($active_sources)) {
        foreach ($active_sources as $s) {
            $source_indices[] = $s['idx'];
        }
    }
    global $cms_api_list;
    foreach ($cms_api_list as $idx => $api_url) {
        if (!in_array($idx, $source_indices)) {
            $source_indices[] = $idx;
        }
    }

    // 辅助加载函数：轮询抓取直到抓到数据，保障首页各大栏目永不落空
    $fetch_section = function($category, $fallback_type) use ($source_indices) {
        foreach ($source_indices as $src_idx) {
            $params = array(
                'ac' => 'detail',
                'category' => $category,
                't' => $fallback_type,
                'pg' => 1,
                'source_idx' => $src_idx
            );
            $res = cms_api_request($params);
            if ($res && !empty($res['list'])) {
                $list = cms_format_list($res['list']);
                if (!empty($list)) {
                    return $list;
                }
            }
        }
        return array();
    };

    $data['dianshi'] = $fetch_section('dianshi', 13);
    $data['dianying'] = $fetch_section('dianying', 6);
    $data['zongyi'] = $fetch_section('zongyi', 25);
    $data['dongman'] = $fetch_section('dongman', 29);

    // Banner: 从各分类随机取，优先选择有简介的内容
    $all = array();
    foreach (array('dianshi', 'dianying', 'zongyi', 'dongman') as $key) {
        if (!empty($data[$key])) {
            $all = array_merge($all, $data[$key]);
        }
    }
    if (!empty($all)) {
        shuffle($all);
        $data['banner'] = array_slice($all, 0, 6);
    }

    return $data;
}

/**
 * 列表页数据
 *
 * @param array $params  请求参数
 *
 * @return array
 */
function cms_concurrent_list($type, $filter, $page, $limit = 24)
{
    global $cms_api_list;

    // 1. 获取延迟最低的前 5 大健康在线源站
    $active_sources = cms_get_active_sources(5);
    if (empty($active_sources)) {
        return array('list' => array(), 'hasmore' => false);
    }

    $fallback_types = array(
        'dianying' => 6,
        'dianshi'  => 13,
        'zongyi'   => 25,
        'dongman'  => 29,
    );
    $cms_type = isset($fallback_types[$type]) ? $fallback_types[$type] : 1;

    $chs = array();
    $mh = curl_multi_init();

    // 2. 并发向这些健康源请求当前页面数据
    foreach ($active_sources as $src) {
        $idx = $src['idx'];
        $api_url = $src['url'];

        // 解析当前源在该分类下的 type_id
        if (!empty($filter) && !ctype_digit((string)$filter)) {
            $t = cms_resolve_sub_type_id($api_url, $type, $filter, 0);
            if ($t <= 0) {
                // 如果该源没有这个子分类，直接跳过，防止拉错数据
                continue;
            }
        } else {
            $t = !empty($filter) ? intval($filter) : cms_resolve_type_id($api_url, $type, $cms_type);
        }

        $url = $api_url . '?' . http_build_query(array(
            'ac' => 'detail',
            't'  => $t,
            'pg' => $page
        ));

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        curl_setopt($ch, CURLOPT_TIMEOUT, 3); // 3秒并发超时，保障流畅体验
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Accept: application/json',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ));

        curl_multi_add_handle($mh, $ch);
        $chs[$idx] = $ch;
    }

    if (empty($chs)) {
        curl_multi_close($mh);
        return array('list' => array(), 'hasmore' => false);
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

    // 3. 收集并融合去重
    $merged_list = array();
    foreach ($chs as $idx => $ch) {
        $response = curl_multi_getcontent($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($http_code === 200 && !empty($response)) {
            $res_data = json_decode($response, true);
            if (!empty($res_data['list'])) {
                foreach ($res_data['list'] as $vod) {
                    $vod['source_idx'] = $idx;
                    $merged_list[] = $vod;
                }
            }
        }
        curl_multi_remove_handle($mh, $ch);
        if (PHP_VERSION_ID < 80000) {
            @curl_close($ch);
        }
    }
    curl_multi_close($mh);

    // 双向去重与多源 ID 合并
    $unique_vods = array();
    foreach ($merged_list as $vod) {
        $title = isset($vod['vod_name']) ? trim($vod['vod_name']) : '';
        if (empty($title)) continue;

        $norm_title = preg_replace('/[\s\-\_\:\：\·]/u', '', mb_strtolower($title));
        $source_prefix_id = $vod['source_idx'] . '_' . $vod['vod_id'];

        if (!isset($unique_vods[$norm_title])) {
            $unique_vods[$norm_title] = $vod;
            $unique_vods[$norm_title]['merged_ids'] = array($source_prefix_id);
        } else {
            if (!in_array($source_prefix_id, $unique_vods[$norm_title]['merged_ids'])) {
                $unique_vods[$norm_title]['merged_ids'][] = $source_prefix_id;
            }
        }
    }

    $final_raw_list = array();
    foreach ($unique_vods as $vod) {
        $vod['vod_id'] = implode(',', $vod['merged_ids']);
        $final_raw_list[] = $vod;
    }

    $formatted_list = cms_format_list($final_raw_list);

    $start_offset = ($page - 1) * $limit;
    $slice_list = array_slice($formatted_list, $start_offset, $limit);
    $hasmore = count($formatted_list) > ($start_offset + $limit);

    return array(
        'list'    => $slice_list,
        'hasmore' => $hasmore
    );
}

/**
 * 列表页数据
 *
 * @param array $params  请求参数
 *
 * @return array
 */
function cms_fetch_list($params)
{
    $type = isset($params['type']) ? $params['type'] : 'dianying';
    $page = isset($params['page']) ? max(1, intval($params['page'])) : 1;
    $filter = isset($params['filter']) ? $params['filter'] : '';
    $source = isset($params['source']) && $params['source'] !== '' ? $params['source'] : 'all';

    // 获取健康的在线线路列表 (用于线路导航栏，展现前 6 条)
    $active_sources = cms_get_active_sources(6);

    if ($source === 'all') {
        // 聚合/多线路混合去重模式
        $merged = cms_concurrent_list($type, $filter, $page, 24);
    } else {
        // 单个指定线路展示模式
        $source_idx = intval($source);
        $fallback_types = array(
            'dianying' => 6,
            'dianshi'  => 13,
            'zongyi'   => 25,
            'dongman'  => 29,
        );
        $cms_type = isset($fallback_types[$type]) ? $fallback_types[$type] : 1;

        $api_params = array(
            'ac' => 'detail',
            'category' => $type,
            't'  => $cms_type,
            'source_idx' => $source_idx
        );

        if (!empty($filter)) {
            if (ctype_digit((string)$filter)) {
                $api_params['t'] = intval($filter);
                unset($api_params['category']);
            } else {
                $api_params['sub_category'] = $filter;
            }
        }

        $merged = cms_merged_api_request($api_params, $page, 24);
    }

    return array(
        'filter'      => cms_get_filter($type),
        'list'        => $merged['list'],
        'hasmore'     => $merged['hasmore'],
        'sources'     => $active_sources, // 返回可用的在线高品质线路列表
        'curr_source' => $source          // 当前的线路选项 ('all' 或具体的索引数值)
    );
}

/**
 * 智能请求并合并多个物理页数据，切片出指定的每页大小 (突破资源网固定 20 条的硬限制)
 *
 * @param array $base_params  基础 API 请求参数
 * @param int   $target_page  用户请求的目标页码
 * @param int   $target_size  每页的目标条数 (如 24)
 * @param int   $api_limit    资源网默认返回的每页条数 (固定为 20)
 *
 * @return array  包含 list 和 hasmore 的数组
 */
function cms_merged_api_request($base_params, $target_page, $target_size = 24, $api_limit = 20)
{
    $start_index = ($target_page - 1) * $target_size;
    $end_index = $target_page * $target_size - 1;

    $api_page_start = floor($start_index / $api_limit) + 1;
    $api_page_end = floor($end_index / $api_limit) + 1;

    $merged_list = array();
    $total_pagecount = 0;

    for ($p = $api_page_start; $p <= $api_page_end; $p++) {
        $req_params = $base_params;
        $req_params['pg'] = $p;
        $res = cms_api_request($req_params);
        if ($res && !empty($res['list'])) {
            $merged_list = array_merge($merged_list, $res['list']);
            $total_pagecount = max($total_pagecount, isset($res['pagecount']) ? intval($res['pagecount']) : 0);
        }
    }

    $formatted_list = cms_format_list($merged_list);
    
    $slice_offset = $start_index - ($api_page_start - 1) * $api_limit;
    $final_list = array_slice($formatted_list, $slice_offset, $target_size);

    $total_records = $total_pagecount * $api_limit;
    $hasmore = ($end_index + 1) < $total_records;

    return array(
        'list' => $final_list,
        'hasmore' => $hasmore
    );
}

/**
 * 苹果CMS仓库并发多源搜索
 *
 * @param string $keyword  搜索关键词
 * @param int    $page     目标页码
 * @param int    $limit    每页条数
 *
 * @return array  包含 list 和 hasmore 的数组
 */
function cms_concurrent_search($keyword, $page = 1, $limit = 24)
{
    global $cms_api_list;
    
    $keyword = trim($keyword);
    if (empty($keyword)) {
        return array('list' => array(), 'hasmore' => false);
    }
    
    $encoded_keyword = urlencode($keyword);
    $chs = array();
    $mh = curl_multi_init();
    
    // 并发向所有源请求数据，超时时间限制在 3 秒以保障体验
    foreach ($cms_api_list as $idx => $api_url) {
        $url = $api_url . '?ac=detail&wd=' . $encoded_keyword . '&pg=' . $page;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
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
    
    $merged_list = array();
    foreach ($chs as $idx => $ch) {
        $response = curl_multi_getcontent($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if ($http_code === 200 && !empty($response)) {
            $res_data = json_decode($response, true);
            if (!empty($res_data['list'])) {
                foreach ($res_data['list'] as $vod) {
                    // 加上源索引前缀
                    $vod['vod_id'] = $idx . '_' . $vod['vod_id'];
                    $merged_list[] = $vod;
                }
            }
        }
        
        curl_multi_remove_handle($mh, $ch);
        if (PHP_VERSION_ID < 80000) {
            @curl_close($ch);
        }
    }
    
    curl_multi_close($mh);
    
    // 合并去重 (按标题和分类去重，保留优先级高的源的记录)
    $unique_titles = array();
    $unique_list = array();
    
    foreach ($merged_list as $vod) {
        $title = isset($vod['vod_name']) ? trim($vod['vod_name']) : '';
        if (empty($title)) continue;
        
        // 归一化标题去除空格、破折号、冒号等，提升去重准度
        $norm_title = preg_replace('/[\s\-\_\:\：\·]/u', '', mb_strtolower($title));
        
        if (!isset($unique_titles[$norm_title])) {
            $unique_titles[$norm_title] = true;
            $unique_list[] = $vod;
        }
    }
    
    // 格式化数据列表
    $formatted_list = cms_format_list($unique_list);
    
    // 内存切片分页
    $start_offset = ($page - 1) * $limit;
    $final_list = array_slice($formatted_list, $start_offset, $limit);
    
    $hasmore = count($formatted_list) > ($start_offset + $limit);
    
    return array(
        'list' => $final_list,
        'hasmore' => $hasmore
    );
}

/**
 * 搜索页数据
 *
 * @param array $params  请求参数
 *
 * @return array
 */
function cms_fetch_search($params)
{
    $word = isset($params['word']) ? $params['word'] : '';
    $page = isset($params['page']) ? max(1, intval($params['page'])) : 1;

    return cms_concurrent_search($word, $page, 24);
}

/**
 * 使用 curl_multi 并发去各个 API 搜索视频标题
 *
 * @param string $title  视频标题
 *
 * @return array  合并后的视频详情列表
 */
function cms_multi_search($title)
{
    global $cms_api_list;
    
    $keyword = urlencode($title);
    $chs = array();
    $mh = curl_multi_init();
    
    foreach ($cms_api_list as $idx => $api_url) {
        $url = $api_url . '?ac=detail&wd=' . $keyword;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3); // 3秒超时，防止个别慢站阻塞整体
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
    
    $vod_list = array();
    foreach ($chs as $idx => $ch) {
        $response = curl_multi_getcontent($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if ($http_code === 200 && !empty($response)) {
            $res_data = json_decode($response, true);
            if (!empty($res_data['list'])) {
                foreach ($res_data['list'] as $vod) {
                    $vname = isset($vod['vod_name']) ? trim($vod['vod_name']) : '';
                    if ($vname === $title) {
                        $vod['vod_id'] = $idx . '_' . ($vod['vod_id'] ?? '0');
                        $vod_list[] = $vod;
                        break;
                    }
                }
            }
        }
        
        curl_multi_remove_handle($mh, $ch);
        if (PHP_VERSION_ID < 80000) {
            @curl_close($ch);
        }
    }
    
    curl_multi_close($mh);
    return $vod_list;
}

/**
 * 播放页数据
 *
 * @param array $params  请求参数
 *
 * @return array
 */
function cms_fetch_item($params)
{
    $id = isset($params['id']) ? $params['id'] : '';

    $data = array(
        'title' => '',
        'pic'   => '',
        'desc'  => '',
        'from'  => array(),
        'item'  => array(),
        'guess' => array(),
    );

    if (empty($id)) {
        return $data;
    }

    $id_list = explode(',', $id);
    $vod_list = array();

    if (count($id_list) > 1) {
        // 1. 并发请求合并后的多个源站详情 (效率极高，完全不需要二次模糊检索)
        global $cms_api_list;
        $chs = array();
        $mh = curl_multi_init();

        foreach ($id_list as $prefix_id) {
            if (strpos($prefix_id, '_') !== false) {
                list($source_idx, $real_id) = explode('_', $prefix_id, 2);
                $source_idx = intval($source_idx);
                if (isset($cms_api_list[$source_idx])) {
                    $url = $cms_api_list[$source_idx] . '?' . http_build_query(array(
                        'ac'  => 'detail',
                        'ids' => $real_id
                    ));
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, $url);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                        'Accept: application/json',
                        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    ));
                    curl_multi_add_handle($mh, $ch);
                    $chs[$source_idx] = $ch;
                }
            }
        }

        if (!empty($chs)) {
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

            foreach ($chs as $source_idx => $ch) {
                $response = curl_multi_getcontent($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                if ($http_code === 200 && !empty($response)) {
                    $res_data = json_decode($response, true);
                    if (!empty($res_data['list'])) {
                        $vod = $res_data['list'][0];
                        $vod['source_idx'] = $source_idx;
                        $vod_list[] = $vod;
                    }
                }
                curl_multi_remove_handle($mh, $ch);
                if (PHP_VERSION_ID < 80000) {
                    @curl_close($ch);
                }
            }
        }
        curl_multi_close($mh);
    } else {
        // 2. 兜底逻辑：只含有单源 ID，请求该源并进行跨源搜索
        $result = cms_api_request(array(
            'ac'   => 'detail',
            'ids'  => $id,
        ));
        if ($result && !empty($result['list'])) {
            $vod_list[] = $result['list'][0];
        }
    }

    if (!empty($vod_list)) {
        // 以主源数据构建基础信息
        $data = cms_format_item($vod_list[0]);
        $title = $data['title'];

        // 如果是单源获取，执行标题检索合并其余播放源作为补充
        if (count($id_list) === 1 && !empty($title)) {
            $extra_sources = cms_multi_search($title);
            foreach ($extra_sources as $extra_vod) {
                $extra_item = cms_format_item($extra_vod);
                
                foreach ($extra_item['from'] as $f) {
                    $exists = false;
                    foreach ($data['from'] as $exist_f) {
                        if ($exist_f[2] === $f[2]) {
                            $exists = true;
                            break;
                        }
                    }
                    if (!$exists) {
                        $data['from'][] = $f;
                    }
                }
                
                foreach ($extra_item['episodes'] as $site_name => $ep_list) {
                    if (!isset($data['episodes'][$site_name])) {
                        $data['episodes'][$site_name] = $ep_list;
                        if ($extra_item['hasmore'] == 1) {
                            $data['hasmore'] = 1;
                        }
                    }
                }
            }
        } else {
            // 如果是多源并发获取的，直接合并这几个已拉取出的源的播放线路和选集
            foreach (array_slice($vod_list, 1) as $extra_vod) {
                $extra_item = cms_format_item($extra_vod);
                
                foreach ($extra_item['from'] as $f) {
                    $exists = false;
                    foreach ($data['from'] as $exist_f) {
                        if ($exist_f[2] === $f[2]) {
                            $exists = true;
                            break;
                        }
                    }
                    if (!$exists) {
                        $data['from'][] = $f;
                    }
                }
                
                foreach ($extra_item['episodes'] as $site_name => $ep_list) {
                    if (!isset($data['episodes'][$site_name])) {
                        $data['episodes'][$site_name] = $ep_list;
                        if ($extra_item['hasmore'] == 1) {
                            $data['hasmore'] = 1;
                        }
                    }
                }
            }
        }

        // 根据后端资源站原始排序（即全局 $cms_api_list 里的索引顺序）对线路列表进行重排，把后台排序最靠前的源排在第 1 位
        global $cms_api_list;
        $index_map = array();
        foreach ($cms_api_list as $idx => $api_url) {
            $friendly_name = cms_get_source_name($api_url);
            // 清理多余后缀词以提取核心词进行对齐，如 "360资源" -> "360"
            $core_name = preg_replace('/(资源|云播|M3U8|_M3U8|M3u8|云播库|资源库)/ui', '', $friendly_name);
            $core_name = trim($core_name);
            if (!empty($core_name) && !isset($index_map[$core_name])) {
                $index_map[$core_name] = $idx;
            }
        }

        // 定义获取线路后端排序索引的回调
        $get_source_index = function($name) use ($index_map) {
            // 清理线路后缀，如 "量子M3U8" -> "量子"
            $core_line = preg_replace('/(资源|云播|M3U8|_M3U8|M3u8|云播库|资源库)/ui', '', $name);
            $core_line = trim($core_line);

            if (isset($index_map[$core_line])) {
                return $index_map[$core_line];
            }

            // 模糊交叉匹配
            foreach ($index_map as $core_kw => $idx) {
                if (mb_stripos($core_line, $core_kw) !== false || mb_stripos($core_kw, $core_line) !== false) {
                    return $idx;
                }
            }

            return 999; // 未匹配到的排到最后
        };

        if (count($data['from']) > 1) {
            usort($data['from'], function($a, $b) use ($get_source_index) {
                $idx_a = $get_source_index($a[2]); // $a[2] 是 "1080资源", "360云播" 等线路名
                $idx_b = $get_source_index($b[2]);
                return $idx_a - $idx_b;
            });
        }

        // 重组 episodes 键值顺序，使选集区域呈现的 Tab 线路顺序与 from 播放线路顺序完全保持同步一致
        $sorted_episodes = array();
        foreach ($data['from'] as $f) {
            $site_name = $f[2];
            if (isset($data['episodes'][$site_name])) {
                $sorted_episodes[$site_name] = $data['episodes'][$site_name];
            }
        }
        $data['episodes'] = $sorted_episodes;

        $data['item'] = array_keys($data['episodes']);
        if (count($data['from']) > 1) {
            $data['hasmore'] = 1;
        }

        // 获取猜你喜欢
        $type_id = isset($vod_list[0]['type_id']) ? $vod_list[0]['type_id'] : 1;
        $data['guess'] = cms_get_guess($type_id);
    }

    return array('data' => $data);
}

/**
 * 缓存文件路径
 *
 * @param string     $random
 * @param boolean    $return_json
 *
 * @return string
 */
/**
 * 设置缓存（SQLite 实现，向下兼容原接口签名）
 *
 * @param string  $random
 * @param boolean $return_json
 * @param mixed   $data
 * @return bool
 */
function data_cache_set($random, $return_json, $data)
{
    global $data_cache_expire;
    $key = 'apicache_' . md5($random . ($return_json ? '_j' : ''));
    return db_cache_set($key, $data, $data_cache_expire);
}

/**
 * 获取缓存（SQLite 实现，向下兼容原接口签名）
 *
 * @param string  $random
 * @param boolean $return_json
 * @return mixed|false
 */
function data_cache_get($random, $return_json)
{
    $key = 'apicache_' . md5($random . ($return_json ? '_j' : ''));
    return db_cache_get($key);
}

/**
 * 参数编码
 *
 * @param string $str
 *
 * @return string
 */
function modifier_encode($str)
{
    $str = base64_encode($str);
    $strlen = strlen($str);

    $str2 = array(
        isset($str[$strlen - 2]) ? $str[$strlen - 2] : '1',
        isset($str[$strlen - 4]) ? $str[$strlen - 4] : '2',
        isset($str[$strlen - 6]) ? $str[$strlen - 6] : '3',
        isset($str[$strlen - 8]) ? $str[$strlen - 8] : '4',
        isset($str[$strlen - 10]) ? $str[$strlen - 10] : '5'
    );

    $str = $str2[4] . $str2[3] . $str2[2] . $str2[1] . $str;

    $str3 = '';
    for ($i = 0; $i < $strlen + 4; ++$i) {
        if ($i % 5 === 0) { $str3 .= $str2[($i / 5) % 5]; }
        $str3 .= $str[$i];
    }

    return strtr($str3, array('/' => '-', '=' => '_', '+' => '.'));
}

/**
 * 参数解码
 *
 * @param string $str
 *
 * @return array
 */
function modifier_decode($str)
{
    if (empty($str)) {
        return array();
    }

    // 将 URL 安全的字符转回 Base64
    $str = strtr($str, array('-' => '/', '_' => '=', '.' => '+'));
    $strlen = strlen($str);
    
    // 逆向过滤掉 % 6 === 0 的混淆字符
    $str3 = '';
    for ($i = 0; $i < $strlen; $i++) {
        if ($i % 6 !== 0) {
            $str3 .= $str[$i];
        }
    }

    // 剥离最前方的 4 个头部干扰字符
    $base64_data = substr($str3, 4);
    
    // Base64 解码得到原本的明文字符
    $data_str = base64_decode($base64_data);
    
    // 反序列化输出
    $json_decoded = json_decode($data_str, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        return $json_decoded;
    }
    
    return $data_str;
}