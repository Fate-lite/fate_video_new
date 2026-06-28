<?php
require "./data/index.php";
$data = data(array("act" => "index"));
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
<link href="./static_yk/images/icon-192.png" rel="shortcut icon">
<title>Fate视频 - 百万影视在线免费观看</title>
<meta name="keywords" content="电影,电视剧,综艺,动漫,在线观看">
<meta name="description" content="百万影视在线免费观看">
<link rel="manifest" href="./manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Fate视频">
<link rel="apple-touch-icon" href="./static_yk/images/pwa-icon-192.png">
<link rel="stylesheet" href="./static_yk/css/common.css?v=<?php echo $ver; ?>">
</head>
<body>

<div class="header">
	<a class="logo" href="./" style="background-image:url(./static_yk/images/logo.png)"></a>
	<div class="navigate">
		<a href="./" class="current">精选</a>
		<a href="./list/dianying/">电影</a>
		<a href="./list/dianshi/">电视剧</a>
		<a href="./list/zongyi/">综艺</a>
		<a href="./list/dongman/">动漫</a>
	</div>
	<div class="search">
		<input type="text" placeholder="搜索你想看的影片..." id="search" />
		<a id="searchDo"></a>
	</div>
	
	<div class="user-area" id="staticUserArea"><?php echo cms_render_user_area(0); ?></div>
</div>

<div class="main-wrap">

	<?php if(!empty($data['banner'])){ ?>
	<div class="slider" id="slider">
		<ul>
			<?php foreach($data['banner'] as $k => $v){ ?>
			<li<?php echo $k === 0 ? ' class="active"' : ''?>>
				<a href="./play/?vid=<?php echo urlencode($v['id'])?>">
					<div class="banner-bg" style="background-image:url(<?php echo htmlspecialchars($v['pic'])?>)"></div>
					<div class="banner-content">
						<img class="banner-poster" src="<?php echo htmlspecialchars($v['pic'])?>" alt="<?php echo htmlspecialchars($v['title'])?>">
						<div class="banner-info">
							<h2 class="banner-title"><?php echo htmlspecialchars($v['title'])?></h2>
							<div class="banner-meta">
								<span><?php echo htmlspecialchars($v['type'] ? $v['type'] : '推荐')?></span>
								<?php if($v['year']){ ?><span><?php echo htmlspecialchars($v['year'])?></span><?php } ?>
								<?php if($v['hint']){ ?><span><?php echo htmlspecialchars($v['hint'])?></span><?php } ?>
							</div>
							<?php if($v['desc']){ ?>
							<p class="banner-desc"><?php echo htmlspecialchars($v['desc'])?></p>
							<?php } ?>
						</div>
					</div>
				</a>
			</li>
			<?php } ?>
		</ul>
		<ol>
			<?php foreach($data['banner'] as $k => $v){ ?>
			<li<?php echo $k === 0 ? ' class="active"' : ''?>></li>
			<?php } ?>
		</ol>
	</div>
	<?php } ?>

	<?php
	$sections = array(
		'dianshi' => '热播电视剧',
		'dianying' => '热播电影',
		'zongyi' => '热播综艺',
		'dongman' => '热播动漫',
	);
	$links = array(
		'dianshi' => './list/dianshi/',
		'dianying' => './list/dianying/',
		'zongyi' => './list/zongyi/',
		'dongman' => './list/dongman/',
	);
	?>
	<?php foreach($sections as $key => $title){ ?>
	<div class="section">
		<div class="section-title">
			<span><?php echo $title?></span>
			<a href="<?php echo $links[$key]?>">查看更多 →</a>
		</div>
		<div class="video-grid" id="<?php echo $key?>List">
			<?php foreach($data[$key] as $v){ ?>
			<a href="./play/?vid=<?php echo urlencode($v['id'])?>" class="video-card">
				<div class="poster">
					<img src="<?php echo htmlspecialchars($v['pic'])?>" alt="<?php echo htmlspecialchars($v['title'])?>" loading="lazy">
					<?php if($v['hint']){ ?><span class="badge"><?php echo htmlspecialchars($v['hint'])?></span><?php } ?>
				</div>
				<div class="info">
					<div class="name"><?php echo htmlspecialchars($v['title'])?></div>
				</div>
			</a>
			<?php } ?>
		</div>
	</div>
	<?php } ?>

</div>

<div class="copyright">
	<p>本站内容均来自于互联网资源实时采集</p>
	<p>如有侵权请联系删除</p>
</div>

<div class="scroll-top" id="scrollTop"></div>
<div class="mode-toggle" id="modeToggle"><span class="dot"></span><span>PC模式</span></div>

<script src="./static_yk/js/jquery.min.js"></script>
<script src="./static_yk/js/common.js?v=<?php echo $ver; ?>"></script>
<script src="./static_yk/js/index.js?v=<?php echo $ver; ?>"></script>
</body>
</html>