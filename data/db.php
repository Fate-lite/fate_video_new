<?php
/**
 * Fate Video — SQLite 数据库封装层
 *
 * 功能模块：
 *   1. cache          — API 响应缓存（替代 /cache/Ymd/*.cache 文件堆）
 *   2. search_history — 搜索词频统计（新增）
 *   3. source_status  — 采集源测速状态（替代 status_cache.json）
 */

/**
 * 获取 SQLite PDO 单例连接（懒初始化 + 自动建表）
 *
 * @return PDO
 */
function db_get()
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $db_path = dirname(__FILE__) . '/fate.db';

    try {
        $pdo = new PDO('sqlite:' . $db_path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        // WAL 模式：大幅提升并发读写性能，防止写锁冲突
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA synchronous  = NORMAL');
        $pdo->exec('PRAGMA cache_size   = 4000');
        $pdo->exec('PRAGMA temp_store   = MEMORY');

        db_create_tables($pdo);
    } catch (Exception $e) {
        // SQLite 初始化失败时不 crash，返回 null 让调用方降级
        $pdo = null;
        error_log('[fate_db] SQLite init failed: ' . $e->getMessage());
    }

    return $pdo;
}

/**
 * 建表（幂等，IF NOT EXISTS）
 */
function db_create_tables($pdo)
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cache (
            cache_key  TEXT    PRIMARY KEY,
            data       TEXT    NOT NULL,
            created_at INTEGER NOT NULL,
            expire_at  INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cache_expire ON cache(expire_at);

        CREATE TABLE IF NOT EXISTS search_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword     TEXT    NOT NULL,
            count       INTEGER DEFAULT 1,
            last_search INTEGER NOT NULL,
            UNIQUE(keyword)
        );
        CREATE INDEX IF NOT EXISTS idx_search_count ON search_history(count DESC);

        CREATE TABLE IF NOT EXISTS source_status (
            api_url    TEXT    PRIMARY KEY,
            latency_ms INTEGER,
            is_online  INTEGER DEFAULT 0,
            last_check INTEGER NOT NULL
        );
    ");
}

/* ─────────────────────────────────────────
   CACHE
   ───────────────────────────────────────── */

/**
 * 读缓存
 *
 * @param string $key
 * @return mixed|false  命中返回原数据，未命中或过期返回 false
 */
function db_cache_get($key)
{
    $pdo = db_get();
    if (!$pdo) return false;

    try {
        $stmt = $pdo->prepare(
            'SELECT data FROM cache WHERE cache_key = ? AND expire_at > ?'
        );
        $stmt->execute([$key, time()]);
        $row = $stmt->fetch();
        if ($row) {
            return json_decode($row['data'], true);
        }
    } catch (Exception $e) {
        error_log('[fate_db] cache_get error: ' . $e->getMessage());
    }
    return false;
}

/**
 * 写缓存
 *
 * @param string $key
 * @param mixed  $data
 * @param int    $ttl   有效期（秒），默认 30 分钟
 * @return bool
 */
function db_cache_set($key, $data, $ttl = 1800)
{
    $pdo = db_get();
    if (!$pdo) return false;

    try {
        $now = time();
        $stmt = $pdo->prepare(
            'INSERT OR REPLACE INTO cache (cache_key, data, created_at, expire_at)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$key, json_encode($data, JSON_UNESCAPED_UNICODE), $now, $now + $ttl]);
        return true;
    } catch (Exception $e) {
        error_log('[fate_db] cache_set error: ' . $e->getMessage());
    }
    return false;
}

/**
 * 删除全部缓存（后台清理操作使用）
 *
 * @return int  删除行数
 */
function db_cache_clear()
{
    $pdo = db_get();
    if (!$pdo) return 0;

    try {
        $pdo->exec('DELETE FROM cache');
        return 1;
    } catch (Exception $e) {
        error_log('[fate_db] cache_clear error: ' . $e->getMessage());
    }
    return 0;
}

/**
 * 清理已过期的缓存条目（低频触发，节省磁盘）
 *
 * @return int  删除行数
 */
function db_cache_clean_expired()
{
    $pdo = db_get();
    if (!$pdo) return 0;

    try {
        $stmt = $pdo->prepare('DELETE FROM cache WHERE expire_at <= ?');
        $stmt->execute([time()]);
        return $stmt->rowCount();
    } catch (Exception $e) {
        error_log('[fate_db] cache_clean error: ' . $e->getMessage());
    }
    return 0;
}

/**
 * 获取缓存统计（条目数、占用字节估算）
 *
 * @return array  ['count' => int, 'size_bytes' => int]
 */
function db_cache_stats()
{
    $pdo = db_get();
    if (!$pdo) return ['count' => 0, 'size_bytes' => 0];

    try {
        $row = $pdo->query(
            "SELECT COUNT(*) as cnt, SUM(LENGTH(data)) as sz FROM cache WHERE expire_at > " . time()
        )->fetch();
        return [
            'count'      => (int)($row['cnt'] ?? 0),
            'size_bytes' => (int)($row['sz']  ?? 0),
        ];
    } catch (Exception $e) {
        error_log('[fate_db] cache_stats error: ' . $e->getMessage());
    }
    return ['count' => 0, 'size_bytes' => 0];
}

/* ─────────────────────────────────────────
   SEARCH HISTORY
   ───────────────────────────────────────── */

/**
 * 记录一次搜索（计数 +1，更新最后搜索时间）
 *
 * @param string $keyword
 */
function db_search_record($keyword)
{
    $keyword = trim($keyword);
    if (empty($keyword) || mb_strlen($keyword) > 100) return;

    $pdo = db_get();
    if (!$pdo) return;

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO search_history (keyword, count, last_search)
             VALUES (?, 1, ?)
             ON CONFLICT(keyword) DO UPDATE SET
               count       = count + 1,
               last_search = excluded.last_search'
        );
        $stmt->execute([$keyword, time()]);
    } catch (Exception $e) {
        error_log('[fate_db] search_record error: ' . $e->getMessage());
    }
}

/**
 * 获取热搜词列表（按搜索次数降序）
 *
 * @param int $limit  返回条数
 * @return array  [ ['keyword'=>'...','count'=>N,'last_search'=>ts], ... ]
 */
function db_search_hot($limit = 20)
{
    $pdo = db_get();
    if (!$pdo) return [];

    try {
        $stmt = $pdo->prepare(
            'SELECT keyword, count, last_search FROM search_history
             ORDER BY count DESC, last_search DESC LIMIT ?'
        );
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    } catch (Exception $e) {
        error_log('[fate_db] search_hot error: ' . $e->getMessage());
    }
    return [];
}

/**
 * 清空搜索历史
 */
function db_search_clear()
{
    $pdo = db_get();
    if (!$pdo) return;
    try {
        $pdo->exec('DELETE FROM search_history');
    } catch (Exception $e) {
        error_log('[fate_db] search_clear error: ' . $e->getMessage());
    }
}

/* ─────────────────────────────────────────
   SOURCE STATUS
   ───────────────────────────────────────── */

/**
 * 写入或更新一个采集源的测速状态
 *
 * @param string $api_url
 * @param int    $latency_ms  延迟毫秒（-1 表示超时/离线）
 * @param bool   $is_online
 */
function db_source_upsert($api_url, $latency_ms, $is_online)
{
    $pdo = db_get();
    if (!$pdo) return;

    try {
        $stmt = $pdo->prepare(
            'INSERT OR REPLACE INTO source_status (api_url, latency_ms, is_online, last_check)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$api_url, (int)$latency_ms, $is_online ? 1 : 0, time()]);
    } catch (Exception $e) {
        error_log('[fate_db] source_upsert error: ' . $e->getMessage());
    }
}

/**
 * 批量写入测速结果
 *
 * @param array $results  [ ['url'=>'...','latency'=>N,'online'=>bool], ... ]
 */
function db_source_upsert_batch($results)
{
    $pdo = db_get();
    if (!$pdo || empty($results)) return;

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'INSERT OR REPLACE INTO source_status (api_url, latency_ms, is_online, last_check)
             VALUES (?, ?, ?, ?)'
        );
        $now = time();
        foreach ($results as $r) {
            $stmt->execute([
                $r['url'],
                (int)($r['latency'] ?? -1),
                isset($r['online']) && $r['online'] ? 1 : 0,
                $now,
            ]);
        }
        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('[fate_db] source_upsert_batch error: ' . $e->getMessage());
    }
}

/**
 * 读取所有采集源的测速状态
 *
 * @param int $max_age_sec  最大缓存年龄（超过则认为过期），默认 1 小时
 * @return array|null  null 表示无数据或已过期
 */
function db_source_list($max_age_sec = 3600)
{
    $pdo = db_get();
    if (!$pdo) return null;

    try {
        // 取最近一次检测时间
        $row = $pdo->query('SELECT MAX(last_check) as t FROM source_status')->fetch();
        $last_check = (int)($row['t'] ?? 0);

        if ($last_check === 0 || time() - $last_check > $max_age_sec) {
            return null; // 数据过期，需要重新探测
        }

        $stmt = $pdo->query(
            'SELECT api_url, latency_ms, is_online, last_check
             FROM source_status ORDER BY is_online DESC, latency_ms ASC'
        );
        return $stmt->fetchAll();
    } catch (Exception $e) {
        error_log('[fate_db] source_list error: ' . $e->getMessage());
    }
    return null;
}

/**
 * 获取数据库文件大小（字节）
 *
 * @return int
 */
function db_file_size()
{
    $path = dirname(__FILE__) . '/fate.db';
    return file_exists($path) ? filesize($path) : 0;
}
