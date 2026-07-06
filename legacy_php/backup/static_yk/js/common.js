$(window).on('pageshow load', function() {
	var loader = document.getElementById('pageLoading');
	if (loader) {
		loader.classList.remove('show');
	}
});

$(function(){
	// 移动端/触屏设备及宽窄屏检测，为 html 元素添加 .mobile-layout 便于 CSS 动态微调
	var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || $(window).width() <= 768;
	if (isMobile) {
		$('html').addClass('mobile-layout');
	}

	// 自动注入全局 Page Loading DOM
	if ($('#pageLoading').length === 0) {
		$('body').append('<div class="page-loading" id="pageLoading"><div class="spinner"></div></div>');
	}

	// PWA 启动屏遮罩注入与淡出动画逻辑
	var isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || location.search.indexOf('pwa=1') > -1;
	if (isPWA && !sessionStorage.getItem('pwa_splash_shown')) {
		sessionStorage.setItem('pwa_splash_shown', '1');
		var rootPath = location.pathname.indexOf('/list/') > -1 || location.pathname.indexOf('/play/') > -1 ? '../../' : './';
		var splashDiv = $('<div class="pwa-splash" id="pwaSplash">' +
			'  <div class="pwa-splash-logo">' +
			'    <img src="' + rootPath + 'static_yk/images/pwa-icon-512.png" alt="Logo">' +
			'  </div>' +
			'  <div class="pwa-splash-loader">' +
			'    <div class="pwa-splash-bar"></div>' +
			'  </div>' +
			'</div>');
		$('body').append(splashDiv);
		
		$(window).on('load', function() {
			setTimeout(function() {
				splashDiv.addClass('fade-out');
				setTimeout(function() {
					splashDiv.remove();
				}, 500);
			}, 1600);
		});
		
		// 兜底自动关闭，防加载卡死
		setTimeout(function() {
			if ($('#pwaSplash').length > 0) {
				$('#pwaSplash').addClass('fade-out');
				setTimeout(function() {
					$('#pwaSplash').remove();
				}, 500);
			}
		}, 3000);
	}

	// 全局 A 标签劫持跳转动画
	$(document).on('click', 'a', function(e) {
		var href = $(this).attr('href');
		var target = $(this).attr('target');
		
		if (!href || href === '#' || href.indexOf('javascript:') === 0 || target === '_blank') {
			return;
		}
		
		// 排除列表页里的 AJAX 筛选及局部 AJAX 分页
		if ($(this).closest('#filterBar').length > 0 || $(this).closest('.pagination').length > 0) {
			return;
		}
		
		// 排除详情页选集区域
		if ($(this).hasClass('ep-btn') || $(this).closest('.episodes-grid').length > 0) {
			return;
		}

		$('#pageLoading').addClass('show');

		// 移动端/触屏设备下，延迟跳转以确保 loading 动画成功渲染呈现
		if (isMobile) {
			e.preventDefault();
			setTimeout(function() {
				location.href = href;
			}, 150);
		}
	});

	// 提取通用搜索跳转逻辑
	function doSearchRedirect(val) {
		saveSearchKeyword(val);
		$('#pageLoading').addClass('show');
		var url = '';
		if(location.href.indexOf('/list/') > -1){
			if(location.href.indexOf('search') < 0){
				url = '../search/?keyword=' + encodeURIComponent(val);
			}else{
				url = './?keyword=' + encodeURIComponent(val);
			}
		}else if(location.href.indexOf('play') > -1){
			url = '../list/search/?keyword=' + encodeURIComponent(val);
		}else{
			url = './list/search/?keyword=' + encodeURIComponent(val);
		}
		
		if (isMobile) {
			setTimeout(function() {
				location.href = url;
			}, 150);
		} else {
			location.href = url;
		}
	}

	function saveSearchKeyword(val) {
		if (!val) return;
		var historyKey = 'fate_search_history';
		var list = [];
		try {
			list = JSON.parse(localStorage.getItem(historyKey) || '[]');
		} catch(e){}
		list = list.filter(function(x){ return x !== val; });
		list.unshift(val);
		if(list.length > 6) list = list.slice(0, 6);
		localStorage.setItem(historyKey, JSON.stringify(list));
	}

	function renderSearchHistory() {
		var historyKey = 'fate_search_history';
		var list = [];
		try {
			list = JSON.parse(localStorage.getItem(historyKey) || '[]');
		} catch(e){}
		if (list.length === 0) {
			$('#searchOverlayHistory').hide();
			return;
		}
		var html = '';
		list.forEach(function(item){
			html += '<span class="history-tag">' + escapeHtml(item) + '</span>';
		});
		$('#searchHistoryTags').html(html);
		$('#searchOverlayHistory').show();
	}

	function escapeHtml(text) {
		if (!text) return '';
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	// 移动端搜索点击拦截
	$(document).on('click', '.mobile-layout .header .search a#searchDo', function(e){
		e.preventDefault();
		e.stopPropagation();
		showSearchOverlay();
	});

	function showSearchOverlay() {
		if ($('#searchOverlay').length === 0) {
			var overlayHtml = 
				'<div class="search-overlay" id="searchOverlay">' +
				'  <div class="search-overlay-glow"></div>' +
				'  <div class="search-overlay-close" id="searchOverlayClose">✕</div>' +
				'  <div class="search-overlay-content">' +
				'    <div class="search-overlay-box">' +
				'      <input type="text" placeholder="搜索影片、综艺、动漫..." id="overlaySearchInput" />' +
				'      <div class="overlay-search-btn" id="overlaySearchDo">搜索</div>' +
				'    </div>' +
				'    <div class="search-overlay-history" id="searchOverlayHistory" style="display:none;">' +
				'      <div class="history-title-row">' +
				'        <span class="history-title">🕒 历史搜索</span>' +
				'        <span class="clear-history-btn" id="clearSearchHistory">清空</span>' +
				'      </div>' +
				'      <div class="history-tags" id="searchHistoryTags"></div>' +
				'    </div>' +
				'    <div class="search-overlay-hot">' +
				'      <div class="hot-title">🔥 热门搜索</div>' +
				'      <div class="hot-tags">' +
				'        <span class="hot-tag">庆余年</span>' +
				'        <span class="hot-tag">歌手2024</span>' +
				'        <span class="hot-tag">玫瑰的故事</span>' +
				'        <span class="hot-tag">三体</span>' +
				'        <span class="hot-tag">头脑特工队2</span>' +
				'      </div>' +
				'    </div>' +
				'    <div class="search-overlay-autocomplete" id="overlayAutocomplete" style="display:none;"></div>' +
				'  </div>' +
				'</div>';
			$('body').append(overlayHtml);
			
			// 绑定关闭事件
			$('#searchOverlayClose, #searchOverlay').on('click', function(e){
				if (e.target.id === 'searchOverlay' || e.target.id === 'searchOverlayClose') {
					$('#searchOverlay').removeClass('show');
				}
			});
			
			// 绑定热搜标签点击事件
			$(document).on('click', '#searchOverlay .hot-tag', function(){
				var tagVal = $(this).text().trim();
				$('#overlaySearchInput').val(tagVal);
				$('#overlaySearchDo').trigger('click');
			});

			// 绑定历史标签点击事件
			$(document).on('click', '#searchOverlayHistory .history-tag', function(){
				var tagVal = $(this).text().trim();
				$('#overlaySearchInput').val(tagVal);
				$('#overlaySearchDo').trigger('click');
			});

			// 绑定清空历史记录事件
			$(document).on('click', '#clearSearchHistory', function(e){
				e.preventDefault();
				e.stopPropagation();
				localStorage.removeItem('fate_search_history');
				$('#searchOverlayHistory').slideUp(200);
			});

			// 绑定搜索执行
			$('#overlaySearchDo').on('click', function(){
				var val = $('#overlaySearchInput').val().trim();
				if(!val){ $('#overlaySearchInput').focus(); return; }
				doSearchRedirect(val);
			});
			$('#overlaySearchInput').on('keydown', function(e){
				if(e.keyCode === 13) $('#overlaySearchDo').trigger('click');
			});
		}
		
		renderSearchHistory();
		$('#searchOverlay').addClass('show');
		setTimeout(function(){
			$('#overlaySearchInput').focus();
		}, 200);
	}

	// 联想搜索防抖与渲染
	var searchTimer;
	$(document).on('input', '#search, #overlaySearchInput', function(){
		var $input = $(this);
		var val = $input.val().trim();
		var isOverlay = $input.attr('id') === 'overlaySearchInput';

		clearTimeout(searchTimer);
		if (!val) {
			if (isOverlay) {
				$('#overlayAutocomplete').hide().html('');
				$('.search-overlay-hot, #searchOverlayHistory').show();
			} else {
				renderPcSearchHistory();
			}
			return;
		}

		searchTimer = setTimeout(function(){
			var apiPath = location.pathname.indexOf('/list/') > -1 || location.pathname.indexOf('/play/') > -1
				? '../../data/autocomplete.php'
				: './data/autocomplete.php';

			$.getJSON(apiPath, { q: val }, function(data){
				if (!data || data.length === 0) {
					if (isOverlay) {
						$('#overlayAutocomplete').hide().html('');
						$('.search-overlay-hot, #searchOverlayHistory').show();
					} else {
						$('#searchAutocompleteDropdown').hide().html('');
					}
					return;
				}

				var html = '';
				data.forEach(function(item){
					var href = location.pathname.indexOf('/list/') > -1 || location.pathname.indexOf('/play/') > -1
						? '../../play/?vid=' + encodeURIComponent(item.id)
						: './play/?vid=' + encodeURIComponent(item.id);
					
					html += '<a href="' + href + '" class="autocomplete-item">';
					html += '  <span class="item-title">' + escapeHtml(item.title) + '</span>';
					html += '  <span class="item-meta">' + escapeHtml(item.type) + ' · ' + escapeHtml(item.hint) + '</span>';
					html += '</a>';
				});

				if (isOverlay) {
					$('.search-overlay-hot, #searchOverlayHistory').hide();
					$('#overlayAutocomplete').html(html).show();
				} else {
					if ($('#searchAutocompleteDropdown').length === 0) {
						var dropdownHtml = '<div class="search-autocomplete-dropdown" id="searchAutocompleteDropdown"></div>';
						$input.parent().append(dropdownHtml);
					}
					$('#searchAutocompleteDropdown').html(html).show();
				}
			});
		}, 200); // 稍微缩短防抖到 200ms，让联想更灵敏
	});

	// PC 历史搜索渲染
	function renderPcSearchHistory() {
		var historyKey = 'fate_search_history';
		var list = [];
		try {
			list = JSON.parse(localStorage.getItem(historyKey) || '[]');
		} catch(e){}
		if (list.length === 0) {
			$('#searchAutocompleteDropdown').hide().html('');
			return;
		}
		
		var html = '<div class="autocomplete-history-title">🕒 历史搜索 <span class="clear-pc-history" id="clearPcSearchHistory">清空</span></div>';
		html += '<div class="autocomplete-history-tags">';
		list.forEach(function(item){
			html += '<span class="pc-history-tag">' + escapeHtml(item) + '</span>';
		});
		html += '</div>';
		
		if ($('#searchAutocompleteDropdown').length === 0) {
			var dropdownHtml = '<div class="search-autocomplete-dropdown" id="searchAutocompleteDropdown"></div>';
			$('#search').parent().append(dropdownHtml);
		}
		$('#searchAutocompleteDropdown').html(html).show();
	}

	// 绑定 PC 历史搜索点击事件
	$(document).on('click', '.pc-history-tag', function(e){
		e.preventDefault();
		e.stopPropagation();
		var val = $(this).text().trim();
		$('#search').val(val);
		$('#searchAutocompleteDropdown').hide();
		doSearchRedirect(val);
	});

	// 联想项被点击时保存为历史搜索词
	$(document).on('click', 'a.autocomplete-item', function(){
		var title = $(this).find('.item-title').text().trim();
		if (title) {
			saveSearchKeyword(title);
		}
	});

	// 绑定 PC 历史搜索清空事件
	$(document).on('click', '#clearPcSearchHistory', function(e){
		e.preventDefault();
		e.stopPropagation();
		localStorage.removeItem('fate_search_history');
		$('#searchAutocompleteDropdown').hide().html('');
	});

	// 点击其他区域隐藏 PC 下拉联想列表
	$(document).on('click', function(e){
		if (!$(e.target).closest('.search').length) {
			$('#searchAutocompleteDropdown').hide();
		}
	});
	$(document).on('focus', '#search', function(){
		var val = $(this).val().trim();
		if (val) {
			if ($('#searchAutocompleteDropdown').length) {
				$('#searchAutocompleteDropdown').show();
			}
		} else {
			renderPcSearchHistory();
		}
	});

	// 搜索键
	$('#searchDo').on('click', function(){
		if ($('html').hasClass('mobile-layout')) return;
		var val = $('#search').val().trim();
		if(!val){ $('#search').focus(); return; }
		doSearchRedirect(val);
	});
	$('#search').keydown(function(e){ 
		if(e.keyCode === 13) {
			if ($('html').hasClass('mobile-layout')) return;
			$('#searchDo').trigger('click'); 
		}
	});

	// 回到顶部
	$(window).scroll(function(){
		var st = $(window).scrollTop();
		$('#scrollTop').toggleClass('show', st > 300);
	});
	$('#scrollTop').on('click', function(){ $('html,body').animate({scrollTop:0},300); });

	// PC模式切换
	var modeKey = 'fate_pc_mode';
	$('#modeToggle').on('click', function(){
		var isPC = localStorage.getItem(modeKey) === '1';
		isPC = !isPC;
		localStorage.setItem(modeKey, isPC ? '1' : '0');
		applyMode(isPC);
	});
	function applyMode(isPC){
		$('#modeToggle').toggleClass('active', isPC);
		if(isPC){
			$('html').addClass('pc-mode');
			$('meta[name="viewport"]').attr('content','width=1200');
		}else{
			$('html').removeClass('pc-mode');
			$('meta[name="viewport"]').attr('content','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0');
		}
	}
	applyMode(localStorage.getItem(modeKey) === '1');

	// 全局图片加载失败智能三级降级拦截 (利用捕获阶段捕获不冒泡 of error 事件)
	window.addEventListener('error', function(event) {
		var target = event.target;
		if (!target || target.tagName !== 'IMG') return;

		var $img = $(target);
		var src = $img.attr('src');
		if (!src) return;

		var stage = parseInt($img.attr('data-err-stage') || '0', 10);

		if (stage === 0) {
			// 第一阶段：如果原图是外链，尝试使用全球免费 CDN 中转代理
			if (src.indexOf('http') === 0 && src.indexOf(location.host) === -1 && src.indexOf('images.weserv.nl') === -1 && src.indexOf('/data/pic.php') === -1) {
				$img.attr('data-err-stage', '1');
				$img.attr('src', 'https://images.weserv.nl/?url=' + encodeURIComponent(src));
				return;
			}
			stage = 1;
		}
		
		if (stage === 1) {
			// 第二阶段：如果公共 CDN 代理依然失败，尝试使用本地 pic.php 进行代理（由我们服务器中转）
			var originalSrc = src;
			if (src.indexOf('https://images.weserv.nl/?url=') === 0) {
				originalSrc = decodeURIComponent(src.replace('https://images.weserv.nl/?url=', ''));
			}
			if (originalSrc.indexOf('http') === 0 && originalSrc.indexOf(location.host) === -1) {
				$img.attr('data-err-stage', '2');
				var rootPath = location.pathname.indexOf('/list/') > -1 || location.pathname.indexOf('/play/') > -1 ? '../../' : './';
				$img.attr('src', rootPath + 'data/pic.php?url=' + encodeURIComponent(originalSrc));
				return;
			}
			stage = 2;
		}

		if (stage === 2) {
			// 第三阶段：终极降级，使用 Cinema Dark 高质感占位图
			$img.attr('data-err-stage', '3');
			var placeholderPath = location.pathname.indexOf('/list/') > -1 || location.pathname.indexOf('/play/') > -1
				? '../../static_yk/images/placeholder.png'
				: './static_yk/images/placeholder.png';
			$img.attr('src', placeholderPath);
		}
	}, true);

	// PWA Service Worker 注册
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', function() {
			navigator.serviceWorker.register('/service-worker.js').then(function(reg) {
				console.log('SW registered on scope: ', reg.scope);
			}).catch(function(err) {
				console.warn('SW registration failed: ', err);
			});
		});
	}
});

// 模板解析
function parseTemplate(tpl, data){
	if(data.id){
		data.href = location.href.indexOf('/list/') < 0
			? './play.html?vid=' + encodeURIComponent(data.id)
			: '../play.html?vid=' + encodeURIComponent(data.id);
	}
	if(data.from){ data.href = data.from[0]; data.site = data.from[2]; }
	for(var k in data){ tpl = tpl.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), data[k]); }
	return tpl;
}

/* Matomo */
var _paq = window._paq = window._paq || [];
/* tracker methods like "setCustomDimension" should be called before "trackPageView" */
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
(function() {
  var u="//matomo.fatepc.eu.org/";
  _paq.push(['setTrackerUrl', u+'matomo.php']);
  _paq.push(['setSiteId', '2']);
  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
  g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
})();
/* End Matomo Code */