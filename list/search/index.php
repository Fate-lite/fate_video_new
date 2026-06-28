<?php
require "../../data/index.php";

$is_fav = isset($_GET['fav']) && $_GET['fav'] == 1;

if (!$is_fav && !isset($_GET["keyword"])) {
    header("Location: ../../");
    die();
}

if (!isset($_GET["page"]) || !is_numeric($_GET["page"]) || $_GET["page"] < 1) {
    $_GET["page"] = 1;
}

if ($is_fav) {
    // 检查是否登录
    if (!isset($_SESSION['user_id'])) {
        header("Location: ../../?login_required=1");
        die();
    }
    $res = data(array("act" => "favorite_list"));
    $data = array(
        'list' => isset($res['list']) ? $res['list'] : array(),
        'hasmore' => false
    );
    $_GET['keyword'] = '我的追剧';
} else {
    $data = data(array("act" => "search", "word" => $_GET["keyword"], "page" => $_GET["page"]));
}

$ver = "20260628_1817";
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="referrer" content="no-referrer">
<script>
(function(){
	var modeKey = 'fate_pc_mode';
	var isPC = localStorage.getItem(modeKey) === '1';
	if(isPC){
		document.documentElement.className += ' pc-mode';
		document.write('<meta name="viewport" content="width=1200">');
	}else{
		document.write('<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0">');
	}
})();
</script>
<link href="../../static_yk/images/icon-192.png" rel="shortcut icon">
<title><?php echo $is_fav ? '我的追剧' : htmlspecialchars($_GET['keyword'])?> - Fate视频</title>
<link rel="manifest" href="../../manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Fate视频">
<link rel="apple-touch-icon" href="../../static_yk/images/pwa-icon-192.png">
<link rel="stylesheet" href="../../static_yk/css/common.css?v=<?php echo $ver; ?>">
</head>
<body>

<div class="header">
	<a class="logo" href="../../" style="background-image:url(../../static_yk/images/logo.png)"></a>
	<div class="navigate">
		<a href="../../">精选</a>
		<a href="../dianying/">电影</a>
		<a href="../dianshi/">电视剧</a>
		<a href="../zongyi/">综艺</a>
		<a href="../dongman/">动漫</a>
	</div>
	<div class="search">
		<input type="text" placeholder="搜索你想看的影片..." id="search" value="<?php echo htmlspecialchars($keyword)?>" />
		<a id="searchDo"></a>
	</div>
	<div class="user-area" id="staticUserArea"><?php echo cms_render_user_area(2); ?></div>
</div>

<div class="main-wrap">
	<div class="search-result">
		<?php echo $is_fav ? '❤️ 我的追剧收藏' : '"<b>' . htmlspecialchars($_GET['keyword']) . '</b>" 的搜索结果'?>
	</div>

	<?php if(!isset($data['list']) || count($data['list']) === 0){ ?>
	<div class="no-data">
		<?php echo $is_fav ? '您还没有收藏过任何影片，在播放页面点击“加入追剧”即可同步到此云端列表。' : '没有找到相关影片，请尝试其他关键词'?>
	</div>
	<?php }else{ ?>
	<div class="video-grid">
		<?php foreach($data['list'] as $v){ ?>
		<a href="../../play/?vid=<?php echo urlencode($v['id'] ?? $v['vid'])?>" class="video-card">
			<div class="poster">
				<img src="<?php echo htmlspecialchars($v['pic'])?>" alt="<?php echo htmlspecialchars($v['title'])?>" loading="lazy">
				<?php if(isset($v['hint']) && $v['hint']){ ?><span class="badge"><?php echo htmlspecialchars($v['hint'])?></span><?php } ?>
			</div>
			<div class="info"><div class="name"><?php echo htmlspecialchars($v['title'])?></div></div>
		</a>
		<?php } ?>
	</div>
	
	<?php if(!$is_fav){ ?>
	<div class="pagination">
		<a href="./?keyword=<?php echo urlencode($_GET['keyword'])?>&page=<?php echo $_GET['page'] - 1?>"<?php echo $_GET['page'] <= 1 ? ' class="disabled"' : ''?>>← 上一页</a>
		<a href="./?keyword=<?php echo urlencode($_GET['keyword'])?>&page=<?php echo $_GET['page'] + 1?>"<?php echo !$data['hasmore'] ? ' class="disabled"' : ''?>>下一页 →</a>
	</div>
	<?php } ?>
	
	<?php } ?>
</div>

<div class="copyright"><p>如有侵权请联系删除</p></div>
<div class="scroll-top" id="scrollTop"></div>
<div class="mode-toggle" id="modeToggle"><span class="dot"></span><span>PC模式</span></div>

<script src="../../static_yk/js/jquery.min.js"></script>
<script src="../../static_yk/js/common.js?v=<?php echo $ver; ?>"></script>
</body>
</html>