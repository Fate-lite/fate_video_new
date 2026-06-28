<?php
if(empty($_GET["vid"])){ header("Location: ../../");die(); }
require "../data/index.php";
$raw = data(array("act" => "item","id" => $_GET["vid"]));
$data = isset($raw['data']) ? $raw['data'] : $raw;
$ver = "20260628_1755";
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
<?php if(isset($data['title'])){ ?>
<title><?php echo htmlspecialchars($data['title'])?> - Fate视频</title>
<?php }else{ ?>
<title>资源不存在</title>
<?php } ?>
<link href="../../static_yk/images/icon-192.png" rel="shortcut icon">
<link rel="manifest" href="../../manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Fate视频">
<link rel="apple-touch-icon" href="../../static_yk/images/icon-192.png">
<link rel="stylesheet" href="../../static_yk/css/common.css?v=<?php echo $ver; ?>">
<link rel="stylesheet" href="../../static_yk/css/play.css?v=<?php echo $ver; ?>">
</head>
<body>

<div class="header">
	<a class="logo" href="../../" style="background-image:url(../../static_yk/images/logo.png)"></a>
	<div class="search">
		<input type="text" placeholder="搜索你想看的影片..." id="search" />
		<a id="searchDo"></a>
	</div>
	<div class="navigate">
		<a href="../../">精选</a>
		<a href="../list/dianying/">电影</a>
		<a href="../list/dianshi/">电视剧</a>
		<a href="../list/zongyi/">综艺</a>
		<a href="../list/dongman/">动漫</a>
	</div>
</div>

<?php if(isset($data['title']) && !empty($data['from'])){ ?>
<script>var fromData=<?php echo json_encode($data); ?>;</script>
<div class="play-wrap">
	<div class="player-box" id="playerBox">
		<div class="player-loading" id="playerLoading">
			<div class="spinner"></div>
			<span>正在加载...</span>
		</div>
		<iframe id="playerFrame" frameborder="no" border="0" scrolling="no" allowfullscreen="true" allowtransparency="true"></iframe>
	</div>

	<h2 class="video-title" id="videoTitle"><?php echo htmlspecialchars($data['title'])?></h2>

	<div class="episodes-wrap" id="episodesWrap" style="display:none">
		<h3>选集</h3>
		<div class="episodes-grid" id="episodesGrid"></div>
	</div>
</div>

<div class="video-info">
	<div class="info-left">
		<?php if($data['pic']){ ?>
		<img src="<?php echo htmlspecialchars($data['pic'])?>" alt="" class="info-poster">
		<?php } ?>
		<div class="info-text">
			<div class="info-header"><h3>影片简介</h3></div>
			<?php if($data['desc']){ ?>
			<p class="info-desc"><?php echo htmlspecialchars($data['desc'])?></p>
			<?php } ?>
		</div>
	</div>
</div>

<?php if(!empty($data['guess'])){ ?>
<div class="guess-wrap">
	<h3>猜你喜欢</h3>
	<div class="guess-grid">
		<?php foreach($data['guess'] as $v){ ?>
		<a href="./?vid=<?php echo urlencode($v['id'])?>" class="video-card">
			<div class="poster">
				<img src="<?php echo htmlspecialchars($v['pic'])?>" alt="<?php echo htmlspecialchars($v['title'])?>" loading="lazy">
				<?php if($v['hint']){ ?><span class="badge"><?php echo htmlspecialchars($v['hint'])?></span><?php } ?>
			</div>
			<div class="info"><div class="name"><?php echo htmlspecialchars($v['title'])?></div></div>
		</a>
		<?php } ?>
	</div>
</div>
<?php } ?>

<?php }else{ ?>
<div class="no-data">未找到可用播放资源</div>
<?php } ?>

<div class="copyright">
	<p>本站内容均来自于互联网资源实时采集</p>
	<p>如有侵权请联系删除</p>
</div>

<div class="scroll-top" id="scrollTop"></div>
<div class="mode-toggle" id="modeToggle"><span class="dot"></span><span>PC模式</span></div>

<script src="../../static_yk/js/jquery.min.js"></script>
<script src="../../static_yk/js/common.js?v=<?php echo $ver; ?>"></script>
<script src="../../static_yk/js/play.js?v=<?php echo $ver; ?>"></script>
</body>
</html>