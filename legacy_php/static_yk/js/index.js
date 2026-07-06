$(function(){
	// 渲染播放历史
	(function renderHistory(){
		var historyKey = 'fate_play_history';
		var list = [];
		try {
			list = JSON.parse(localStorage.getItem(historyKey) || '[]');
		} catch(e){}
		
		if(list.length === 0) return;
		
		function formatTime(seconds) {
			if (!seconds) return '';
			var m = Math.floor(seconds / 60);
			var s = seconds % 60;
			return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
		}
		
		var latest = list[0];
		var latestProgress = latest.progress ? ' (看到 ' + formatTime(latest.progress) + ')' : ' (刚刚观看)';
		var latestInfo = '您上次看到：<b>' + latest.title + '</b> · ' + latest.episode + latestProgress;
		
		var html = '<div class="section history-section">';
		html += '  <div class="history-widget-header" id="historyWidgetHeader">';
		html += '    <div class="history-widget-left">';
		html += '      <span class="history-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>';
		html += '      <span class="history-quick-info">' + latestInfo + '</span>';
		html += '    </div>';
		html += '    <div class="history-widget-right">';
		html += '      <span class="history-arrow"></span>';
		html += '      <a id="clearHistory" class="clear-btn">清空记录</a>';
		html += '    </div>';
		html += '  </div>';
		
		html += '  <div class="history-expand-container" id="historyExpandContainer" style="display:none;">';
		html += '    <div class="video-grid" id="historyList">';
		
		var showList = list.slice(0, 8);
		showList.forEach(function(item){
			var progressStr = '';
			if(item.progress){
				progressStr = '看到 ' + formatTime(item.progress);
			} else {
				progressStr = '刚刚观看';
			}
			html += '    <a href="./play/?vid=' + encodeURIComponent(item.vid) + '" class="video-card">';
			html += '      <div class="poster">';
			html += '        <img src="' + item.pic + '" alt="' + item.title + '" loading="lazy">';
			html += '        <span class="badge">' + item.episode + '</span>';
			html += '      </div>';
			html += '      <div class="info">';
			html += '        <div class="name">' + item.title + '</div>';
			html += '        <div class="meta">' + progressStr + '</div>';
			html += '      </div>';
			html += '    </a>';
		});
		
		html += '    </div>';
		html += '  </div>';
		html += '</div>';
		
		$('.main-wrap').prepend(html);
		
		// 绑定点击展开/收回事件
		$('#historyWidgetHeader').on('click', function(e){
			if($(e.target).closest('#clearHistory').length > 0) return;
			
			var container = $('#historyExpandContainer');
			var header = $('#historyWidgetHeader');
			if(container.is(':hidden')){
				container.slideDown(300);
				header.addClass('expanded');
			} else {
				container.slideUp(250);
				header.removeClass('expanded');
			}
		});
		
		$('#clearHistory').on('click', function(e){
			e.preventDefault();
			e.stopPropagation();
			localStorage.removeItem(historyKey);
			$('.history-section').slideUp(300, function(){
				$(this).remove();
			});
		});
	})();
	// 轮播
	var slider = $('#slider');
	var slides = slider.find('ul li');
	var dots = slider.find('ol li');
	var current = 0;
	var total = slides.length;
	var timer;

	if(total > 1){
		function goSlide(n){
			slides.removeClass('active').eq(n).addClass('active');
			dots.removeClass('active').eq(n).addClass('active');
			current = n;
		}
		function nextSlide(){ goSlide((current + 1) % total); }
		function startAuto(){ timer = setInterval(nextSlide, 4000); }
		function stopAuto(){ clearInterval(timer); }

		slider.on('click', 'ol li', function(e){
			e.preventDefault();
			e.stopPropagation();
			stopAuto();
			goSlide($(this).index());
			startAuto();
		});
		slider.on('touchstart', stopAuto);
		slider.on('touchend', startAuto);
		slider.hover(stopAuto, startAuto);

		startAuto();
	}

	// 换一批按钮（隐藏/显示更多）
	$('.switch-button').on('click', function(){
		var type = $(this).data('list-type');
		var grid = $('#' + type + 'List');
		var cards = grid.find('.video-card');
		var showCount = window.innerWidth > 768 ? 8 : 6;
		var hidden = grid.find('.video-card:hidden');

		if(hidden.length === 0){
			cards.hide();
			cards.slice(0, showCount).show();
		}else{
			cards.hide();
			var start = Math.floor(Math.random() * Math.max(1, cards.length - showCount));
			cards.slice(start, start + showCount).show();
		}
	});

	// 初始显示
	$('.video-grid').each(function(){
		var showCount = window.innerWidth > 768 ? 8 : 6;
		$(this).find('.video-card:gt(' + (showCount - 1) + ')').hide();
	});
});