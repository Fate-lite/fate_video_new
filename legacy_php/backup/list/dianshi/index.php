<?php
if(!isset($_GET["condition"])){ $_GET['condition'] = ""; }
if(!isset($_GET["page"]) || !is_numeric($_GET["page"]) || $_GET["page"] < 1){ $_GET["page"] = 1; }
$type = basename(dirname($_SERVER['SCRIPT_NAME']));
if(!in_array($type, array('dianying','dianshi','zongyi','dongman'))){ $type = 'dianying'; }
require "../../data/index.php";
$data = data(array("act" => "list","type" => $type,"filter" => $_GET["condition"],"page" => $_GET["page"]));
$titles = array('dianying'=>'电影','dianshi'=>'电视剧','zongyi'=>'综艺','dongman'=>'动漫');
$ver = "20260617_2325";
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
<title><?php echo $titles[$type]?> - Fate视频</title>
<link rel="manifest" href="../../manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Fate视频">
<link rel="apple-touch-icon" href="../../static_yk/images/icon-192.png">
<link rel="stylesheet" href="../../static_yk/css/common.css?v=<?php echo $ver; ?>">
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
		<a href="../dianying/"<?php echo $type==='dianying'?' class="current"':''?>>电影</a>
		<a href="../dianshi/"<?php echo $type==='dianshi'?' class="current"':''?>>电视剧</a>
		<a href="../zongyi/"<?php echo $type==='zongyi'?' class="current"':''?>>综艺</a>
		<a href="../dongman/"<?php echo $type==='dongman'?' class="current"':''?>>动漫</a>
	</div>
</div>

<div class="page-loading" id="pageLoading"><div class="spinner"></div></div>

<div class="main-wrap">
	<?php if(!empty($data['filter'])){ ?>
	<div class="filter-bar" id="filterBar">
		<div class="filter-row">
			<div class="opts">
				<a href="./?"<?php echo empty($_GET['condition']) ? ' class="active"' : ''?>>全部</a>
				<?php foreach($data['filter'] as $sub_name){ ?>
					<a href="./?condition=<?php echo urlencode($sub_name)?>"<?php echo isset($_GET['condition']) && $_GET['condition'] === $sub_name ? ' class="active"' : ''?> data-val="<?php echo htmlspecialchars($sub_name)?>"><?php echo htmlspecialchars($sub_name)?></a>
				<?php } ?>
			</div>
		</div>
	</div>
	<?php } ?>

	<div id="listContent">
	<?php if(!isset($data['list']) || count($data['list']) === 0){ ?>
	<div class="no-data">没有找到相关影片</div>
	<?php }else{ ?>
	<div class="video-grid">
		<?php foreach($data['list'] as $v){ ?>
		<a href="../../play/?vid=<?php echo urlencode($v['id'])?>" class="video-card">
			<div class="poster">
				<img src="<?php echo htmlspecialchars($v['pic'])?>" alt="<?php echo htmlspecialchars($v['title'])?>" loading="lazy">
				<?php if($v['hint']){ ?><span class="badge"><?php echo htmlspecialchars($v['hint'])?></span><?php } ?>
			</div>
			<div class="info"><div class="name"><?php echo htmlspecialchars($v['title'])?></div></div>
		</a>
		<?php } ?>
	</div>
	<div class="pagination">
		<a href="./?condition=<?php echo urlencode($_GET['condition'])?>&page=<?php echo $_GET['page'] - 1?>"<?php echo $_GET['page'] <= 1 ? ' class="disabled"' : ''?>>← 上一页</a>
		<a href="./?condition=<?php echo urlencode($_GET['condition'])?>&page=<?php echo $_GET['page'] + 1?>"<?php echo !$data['hasmore'] ? ' class="disabled"' : ''?>>下一页 →</a>
	</div>
	<?php } ?>
	</div>
</div>

<div class="copyright"><p>如有侵权请联系删除</p></div>
<div class="scroll-top" id="scrollTop"></div>
<div class="mode-toggle" id="modeToggle"><span class="dot"></span><span>PC模式</span></div>

<script src="../../static_yk/js/jquery.min.js"></script>
<script src="../../static_yk/js/common.js?v=<?php echo $ver; ?>"></script>
<script>
$(function(){
	// 筛选点击加载动画
	$('#filterBar a').on('click',function(e){
		e.preventDefault();
		var href = $(this).attr('href');
		$('#filterBar a').removeClass('active');
		$(this).addClass('active');
		$('#pageLoading').addClass('show');
		$.get(href,function(html){
			var doc = $(html);
			var content = doc.find('#listContent').html();
			$('#listContent').html(content);
			$('#pageLoading').removeClass('show');
			history.pushState(null,'',href);
		}).fail(function(){
			$('#pageLoading').removeClass('show');
			location.href = href;
		});
	});

	// 分页也用加载动画
	$(document).on('click','.pagination a:not(.disabled)',function(e){
		e.preventDefault();
		var href = $(this).attr('href');
		$('#pageLoading').addClass('show');
		$.get(href,function(html){
			var doc = $(html);
			var content = doc.find('#listContent').html();
			var filters = doc.find('#filterBar').html();
			$('#listContent').html(content);
			if(filters) $('#filterBar').html(filters);
			$('#pageLoading').removeClass('show');
			history.pushState(null,'',href);
			$(window).scrollTop(0);
		}).fail(function(){
			$('#pageLoading').removeClass('show');
			location.href = href;
		});
	});
});
</script>
</body>
</html>