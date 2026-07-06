<?php

/*****
 ** CMS资源采集脚本 (偏重于量子资源网的多源采集)
 *
 *****/

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
$cms_type_keywords = array(
    'dianying' => array('电影', '动作', '喜剧', '爱情', '科幻', '恐怖', '剧情', '战争', '惊悚', '悬疑', '犯罪', '纪录'),
    'dianshi'  => array('国产剧', '国产', '大陆剧', '电视剧', '香港剧', '韩国剧', '欧美剧', '台湾剧', '日本剧', '海外剧', '泰剧'),
    'zongyi'   => array('综艺', '大陆综艺', '港台综艺', '日韩综艺', '欧美综艺'),
    'dongman'  => array('动漫', '国产动漫', '日韩动漫', '欧美动漫', '动画'),
);

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
    global $cms_type_keywords, $data_cache_dir;

    $cache_key = 'typeid_' . md5($api_url . '_' . $category);
    $cache_file = $data_cache_dir . $cache_key . '.cache';
    if (is_file($cache_file)) {
        $cached = json_decode(file_get_contents($cache_file), true);
        if ($cached && time() - ($cached['time'] ?? 0) < 86400) {
            return $cached['type_id'];
        }
    }

    $keywords = isset($cms_type_keywords[$category]) ? $cms_type_keywords[$category] : array();

    $url = $api_url . '?' . http_build_query(array('ac' => 'detail', 'pg' => 1));
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ));
    $response = curl_exec($ch);
    curl_close($ch);

    if (empty($response)) return $fallback;

    $data = json_decode($response, true);
    if (!$data || empty($data['list'])) return $fallback;

    $type_stats = array();
    foreach ($data['list'] as $item) {
        $tid = $item['type_id'] ?? 0;
        $tname = $item['type_name'] ?? '';
        if ($tid && $tname) {
            if (!isset($type_stats[$tid])) {
                $type_stats[$tid] = array('name' => $tname, 'count' => 0);
            }
            $type_stats[$tid]['count']++;
        }
    }

    $best_id = $fallback;
    $best_score = -1;
    foreach ($type_stats as $tid => $info) {
        $score = 0;
        foreach ($keywords as $kw) {
            if (mb_stripos($info['name'], $kw) !== false) {
                $score += 10;
            }
        }
        $score += $info['count'];
        if ($score > $best_score) {
            $best_score = $score;
            $best_id = $tid;
        }
    }

    if (!is_dir($data_cache_dir)) {
        mkdir($data_cache_dir, 0755, true);
    }
    file_put_contents($cache_file, json_encode(array('type_id' => $best_id, 'time' => time())));

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
    global $data_cache_dir;

    $cache_key = 'subtypeid_' . md5($api_url . '_' . $category . '_' . $sub_name);
    $cache_file = $data_cache_dir . $cache_key . '.cache';
    if (is_file($cache_file)) {
        $cached = json_decode(file_get_contents($cache_file), true);
        if ($cached && time() - ($cached['time'] ?? 0) < 86400) {
            return $cached['type_id'];
        }
    }

    $url = $api_url . '?' . http_build_query(array('ac' => 'detail', 'pg' => 1));
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ));
    $response = curl_exec($ch);
    curl_close($ch);

    if (empty($response)) return $fallback;

    $data = json_decode($response, true);
    if (!$data || empty($data['list'])) return $fallback;

    $best_id = $fallback;
    foreach ($data['list'] as $item) {
        $tname = $item['type_name'] ?? '';
        if ($tname === $sub_name || mb_stripos($tname, $sub_name) !== false) {
            $best_id = $item['type_id'];
            break;
        }
    }

    if (!is_dir($data_cache_dir)) {
        mkdir($data_cache_dir, 0755, true);
    }
    file_put_contents($cache_file, json_encode(array('type_id' => $best_id, 'time' => time())));

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

    $source_idx = null;
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
                // 重写返回的 vod_id，加上源索引前缀
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

    // 否则退回顺序轮询
    foreach ($cms_api_list as $idx => $api_url) {
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
 * 动态获取子分类列表 (从各源探测实际存在的分类)
 *
 * @param string $type  父分类 (dianying/dianshi/zongyi/dongman)
 *
 * @return array  子分类名称列表
 */
function cms_get_filter($type)
{
    global $cms_api_list, $data_cache_dir;

    $cache_key = 'filter_' . $type;
    $cache_file = $data_cache_dir . $cache_key . '.cache';
    if (is_file($cache_file)) {
        $cached = json_decode(file_get_contents($cache_file), true);
        if ($cached && time() - ($cached['time'] ?? 0) < 86400) {
            return $cached['list'];
        }
    }

    $type_names = array();
    $checked = 0;
    foreach ($cms_api_list as $api_url) {
        if ($checked >= 5) break;
        $checked++;

        $url = $api_url . '?' . http_build_query(array('ac' => 'detail', 'pg' => 1));
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
        $response = curl_exec($ch);
        curl_close($ch);

        if (empty($response)) continue;
        $data = json_decode($response, true);
        if (!$data || empty($data['list'])) continue;

        foreach ($data['list'] as $item) {
            $tn = $item['type_name'] ?? '';
            if ($tn && !isset($type_names[$tn])) {
                $type_names[$tn] = true;
            }
        }
    }

    $result = array_keys($type_names);
    sort($result);

    if (!is_dir($data_cache_dir)) {
        mkdir($data_cache_dir, 0755, true);
    }
    file_put_contents($cache_file, json_encode(array('list' => $result, 'time' => time())));

    return $result;
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

        default:
            return false;
    }
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

    // 电视剧
    $result = cms_api_request(array('ac' => 'detail', 'category' => 'dianshi', 't' => 13, 'pg' => 1));
    if ($result && !empty($result['list'])) {
        $data['dianshi'] = cms_format_list($result['list']);
    }

    // 电影
    $result = cms_api_request(array('ac' => 'detail', 'category' => 'dianying', 't' => 6, 'pg' => 1));
    if ($result && !empty($result['list'])) {
        $data['dianying'] = cms_format_list($result['list']);
    }

    // 综艺
    $result = cms_api_request(array('ac' => 'detail', 'category' => 'zongyi', 't' => 25, 'pg' => 1));
    if ($result && !empty($result['list'])) {
        $data['zongyi'] = cms_format_list($result['list']);
    }

    // 动漫
    $result = cms_api_request(array('ac' => 'detail', 'category' => 'dongman', 't' => 29, 'pg' => 1));
    if ($result && !empty($result['list'])) {
        $data['dongman'] = cms_format_list($result['list']);
    }

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
function cms_fetch_list($params)
{
    $type = isset($params['type']) ? $params['type'] : 'dianying';
    $page = isset($params['page']) ? max(1, intval($params['page'])) : 1;
    $filter = isset($params['filter']) ? $params['filter'] : '';

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

    return array(
        'filter'  => cms_get_filter($type),
        'list'    => $merged['list'],
        'hasmore' => $merged['hasmore'],
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
            curl_close($ch);
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
            curl_close($ch);
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

    $result = cms_api_request(array(
        'ac'   => 'detail',
        'ids'  => $id,
    ));

    if ($result && !empty($result['list'])) {
        $vod = $result['list'][0];
        $data = cms_format_item($vod);
        
        $title = $data['title'];
        if (!empty($title)) {
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
            $data['item'] = array_keys($data['episodes']);
            if (count($data['from']) > 1) {
                $data['hasmore'] = 1;
            }
        }

        // 获取猜你喜欢
        $type_id = isset($vod['type_id']) ? $vod['type_id'] : 1;
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
function data_cache_file($random, $return_json)
{
    global $data_cache_dir;

    if (!is_dir($data_cache_dir)) {
        mkdir($data_cache_dir, 0755, true);
    }

    return $data_cache_dir . md5($random) . '.cache' . ($return_json === true ? 's' : '');
}

/**
 * 设置缓存
 *
 * @param string     $random
 * @param boolean    $return_json
 * @param string     $data
 *
 * @return boolean
 */
function data_cache_set($random, $return_json, $data)
{
    $cache_file = data_cache_file($random, $return_json);
    file_put_contents($cache_file, json_encode(array('data' => $data, 'time' => time())));
    return true;
}

/**
 * 获取缓存
 *
 * @param string     $random
 * @param boolean    $return_json
 *
 * @return mixed
 */
function data_cache_get($random, $return_json)
{
    global $data_cache_expire;

    $cache_file = data_cache_file($random, $return_json);

    if (is_file($cache_file)) {
        $cache_data = json_decode(file_get_contents($cache_file), true);
        if (isset($cache_data['time']) && time() - $cache_data['time'] < $data_cache_expire) {
            return $cache_data['data'];
        }
    }
    return false;
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