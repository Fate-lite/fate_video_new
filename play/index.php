<?php
if(empty($_GET["vid"])){ header("Location: ../../");die(); }
require "../data/index.php";
$raw = data(array("act" => "item","id" => $_GET["vid"]));
$data = isset($raw['data']) ? $raw['data'] : $raw;
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
<link rel="apple-touch-icon" href="../../static_yk/images/pwa-icon-192.png">
<link rel="stylesheet" href="../../static_yk/css/common.css?v=<?php echo $ver; ?>">
<link rel="stylesheet" href="../../static_yk/css/play.css?v=<?php echo $ver; ?>">
</head>
<body>

<div class="header">
	<a class="logo" href="../../" style="background-image:url(../../static_yk/images/logo.png)"></a>
	<div class="navigate">
		<a href="../../">精选</a>
		<a href="../list/dianying/">电影</a>
		<a href="../list/dianshi/">电视剧</a>
		<a href="../list/zongyi/">综艺</a>
		<a href="../list/dongman/">动漫</a>
	</div>
	<div class="search">
		<input type="text" placeholder="搜索你想看的影片..." id="search" />
		<a id="searchDo"></a>
	</div>
	<div class="user-area" id="staticUserArea"><?php echo cms_render_user_area(1); ?></div>
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

	<!-- 安全防骗警示条 -->
	<div class="player-safety-tip" id="safetyTip" style="display:none;">
		<span class="icon">
			<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
				<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
				<line x1="12" y1="9" x2="12" y2="13"></line>
				<line x1="12" y1="17" x2="12.01" y2="17"></line>
			</svg>
		</span>
		<span class="text"><strong>防骗提示：</strong>视频中内嵌的广告（如棋牌、博彩、招嫖、网贷推广等）均为资源站水印，请勿轻信，谨防上当受骗！</span>
		<span class="close" id="closeSafetyTip">×</span>
	</div>

	<div style="display:flex; align-items:center; justify-content:space-between; margin-top:16px; margin-bottom:12px;">
		<h2 class="video-title" id="videoTitle" style="margin:0;"><?php echo htmlspecialchars($data['title'])?></h2>
		<button class="detail-fav-btn" id="favoriteBtn" style="flex-shrink:0;">
			<span class="icon">
				<svg class="heart-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
					<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
				</svg>
			</span>
			<span class="text">追剧</span>
		</button>
	</div>

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
<script>
$(function(){
	var currentVid = "<?php echo isset($_GET['vid']) ? addslashes($_GET['vid']) : ''?>";
	var vTitle = "<?php echo isset($data['title']) ? addslashes($data['title']) : ''?>";
	var vPic = "<?php echo isset($data['pic']) ? addslashes($data['pic']) : ''?>";

	// 1. 初始化检查该片是否已被收藏
	if (currentVid) {
		$.getJSON('../../data/index.php', { act: 'favorite_check', vid: currentVid }, function(res) {
			if (res && res.favorited) {
				$('#favoriteBtn').addClass('active').find('.text').text('已追');
			}
		});
	}

	// 2. 绑定收藏/追剧按钮点击事件
	$('#favoriteBtn').on('click', function(){
		if (!currentVid) return;
		var $btn = $(this);
		$.getJSON('../../data/index.php', {
			act: 'favorite_toggle',
			vid: currentVid,
			title: vTitle,
			pic: vPic
		}, function(res) {
			if (res && res.code === 1) {
				showToast(res.msg);
				if (res.action === 'add') {
					$btn.addClass('active').find('.text').text('已追');
				} else {
					$btn.removeClass('active').find('.text').text('追剧');
				}
			} else {
				// 未登录，弹出登录弹窗
				showToast(res.msg || '请先登录账号', 'error');
				$('#authModal').addClass('active');
			}
		});
	});

	// 3. 控制防骗警示条显示与收起
	if (!sessionStorage.getItem('hide_safety_tip')) {
		$('#safetyTip').css('display', 'flex');
	}
	$('#closeSafetyTip').on('click', function(){
		$('#safetyTip').slideUp(200);
		sessionStorage.setItem('hide_safety_tip', '1');
	});
});
</script>
<script src="../../static_yk/js/play.js?v=<?php echo $ver; ?>"></script>
</body>
</html>