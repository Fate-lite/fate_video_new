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

	/* ─────────────────────────────────────────
	   第三期：用户中心与云同步交互 JavaScript
	   ───────────────────────────────────────── */

	// 统一的 Toast 提示
	window.showToast = function(msg, type) {
		type = type || 'success';
		var $toast = $('#toastNotice');
		if ($toast.length === 0) {
			$toast = $('<div class="toast-notice" id="toastNotice"></div>');
			$('body').append($toast);
		}
		$toast.removeClass('success error').addClass(type).text(msg).addClass('active');
		setTimeout(function(){
			$toast.removeClass('active');
		}, 3000);
	};

	// 动态插入登录注册的磨砂 Modal 弹窗到页面
	function initAuthModalHTML() {
		if ($('#authModal').length > 0) return;
		var modalHtml = 
		'<div class="auth-modal" id="authModal">' +
		'  <div class="auth-box">' +
		'    <span class="close-btn" id="closeAuthModal">×</span>' +
		'    <div class="title-tabs">' +
		'      <span class="title-tab active" data-target="loginForm">登录</span>' +
		'      <span class="title-tab" data-target="registerForm">注册</span>' +
		'    </div>' +
		'    <!-- 登录表单 -->' +
		'    <form class="auth-form active" id="loginForm" onsubmit="return false;">' +
		'      <div class="auth-group">' +
		'        <label>电子邮箱</label>' +
		'        <div class="auth-input-row"><input type="email" name="email" placeholder="请输入您的注册邮箱" required></div>' +
		'      </div>' +
		'      <div class="auth-group">' +
		'        <label>登录密码</label>' +
		'        <div class="auth-input-row"><input type="password" name="password" placeholder="请输入密码" required></div>' +
		'      </div>' +
		'      <button type="submit" class="auth-submit-btn" id="submitLogin">立即登录</button>' +
		'    </form>' +
		'    <!-- 注册表单 -->' +
		'    <form class="auth-form" id="registerForm" onsubmit="return false;">' +
		'      <div class="auth-group">' +
		'        <label>昵称 (选填)</label>' +
		'        <div class="auth-input-row"><input type="text" name="nickname" placeholder="不填则为邮箱前缀"></div>' +
		'      </div>' +
		'      <div class="auth-group">' +
		'        <label>常用邮箱</label>' +
		'        <div class="auth-input-row"><input type="email" name="email" id="regEmail" placeholder="请输入注册邮箱" required></div>' +
		'      </div>' +
		'      <div class="auth-group">' +
		'        <label>邮箱验证码</label>' +
		'        <div class="auth-input-row">' +
		'          <input type="text" name="code" placeholder="6位数字" required style="padding-right: 110px !important;">' +
		'          <button type="button" class="send-code-btn" id="sendCodeBtn">发送验证码</button>' +
		'        </div>' +
		'      </div>' +
		'      <div class="auth-group">' +
		'        <label>设置密码</label>' +
		'        <div class="auth-input-row"><input type="password" name="password" placeholder="不低于6位" required></div>' +
		'      </div>' +
		'      <button type="submit" class="auth-submit-btn" id="submitRegister">注册并登录</button>' +
		'    </form>' +
		'  </div>' +
		'</div>';
		$('body').append(modalHtml);
	}

	initAuthModalHTML();

	// 动态插入右上角用户区域
	function renderUserHeader(user) {
		$('.header .user-area').remove();
		var html = '';
		if (user) {
			var firstChar = (user.nickname || user.email || 'U').charAt(0).toUpperCase();
			html = 
			'<div class="user-area">' +
			'  <div class="user-profile" id="userProfileBtn">' +
			'    <div class="user-avatar">' + firstChar + '</div>' +
			'    <span class="user-name">' + escapeHtml(user.nickname || '用户') + '</span>' +
			'  </div>' +
			'  <div class="user-dropdown" id="userDropdownMenu">' +
			'    <div class="dropdown-header">' +
			'      <div style="font-weight: bold; font-size: 14px; color: #fff;">' + escapeHtml(user.nickname) + '</div>' +
			'      <div class="email">' + escapeHtml(user.email) + '</div>' +
			'    </div>' +
			'    <a href="' + getRootPath() + '" class="dropdown-item">🏠 返回首页</a>' +
			'    <a href="' + getRootPath() + 'list/search/?fav=1" class="dropdown-item" id="myFavBtn">❤️ 我的追剧</a>' +
			'    <a class="dropdown-item logout" id="logoutBtn">🚪 退出登录</a>' +
			'  </div>' +
			'</div>';
		} else {
			html = 
			'<div class="user-area">' +
			'  <a class="login-btn" id="navLoginBtn">登录 / 注册</a>' +
			'</div>';
		}
		$('.header').append(html);
	}

	function getRootPath() {
		return location.pathname.indexOf('/list/') > -1 || location.pathname.indexOf('/play/') > -1 ? '../../' : './';
	}

	// 初始化请求登录态
	function initUserSession() {
		$.getJSON(getRootPath() + 'data/index.php', { act: 'user_info' }, function(res) {
			if (res && res.code === 1) {
				renderUserHeader(res.user);
				syncLocalHistoryToCloud(); // 登录状态下自动上传同步播放记录
			} else {
				renderUserHeader(null);
			}
		});
	}
	initUserSession();

	// 绑定登录弹窗显示与关闭
	$(document).on('click', '#navLoginBtn', function(){
		$('#authModal').addClass('active');
	});
	$(document).on('click', '#closeAuthModal', function(){
		$('#authModal').removeClass('active');
	});
	$(document).on('click', '.title-tab', function(){
		$('.title-tab').removeClass('active');
		$(this).addClass('active');
		$('.auth-form').removeClass('active');
		$('#' + $(this).data('target')).addClass('active');
	});

	// 发送验证码倒计时控制
	var codeCountdown = 0;
	var countdownTimer = null;
	$(document).on('click', '#sendCodeBtn', function(){
		if (codeCountdown > 0) return;
		var email = $('#regEmail').val().trim();
		if (!email || email.indexOf('@') === -1) {
			showToast('请输入正确的邮箱地址', 'error');
			return;
		}

		$('#sendCodeBtn').addClass('disabled').text('正在发送...');
		$.getJSON(getRootPath() + 'data/index.php', { act: 'send_code', email: email }, function(res) {
			if (res && res.code === 1) {
				showToast(res.msg);
				codeCountdown = 60;
				$('#sendCodeBtn').text(codeCountdown + 's 后重新发送');
				countdownTimer = setInterval(function(){
					codeCountdown--;
					if (codeCountdown <= 0) {
						clearInterval(countdownTimer);
						$('#sendCodeBtn').removeClass('disabled').text('发送验证码');
					} else {
						$('#sendCodeBtn').text(codeCountdown + 's 后重新发送');
					}
				}, 1000);
			} else {
				showToast(res.msg || '验证码发送失败', 'error');
				$('#sendCodeBtn').removeClass('disabled').text('发送验证码');
			}
		}).fail(function(){
			showToast('请求超时，请检查网络后再试', 'error');
			$('#sendCodeBtn').removeClass('disabled').text('发送验证码');
		});
	});

	// 登录表单提交
	$(document).on('submit', '#loginForm', function(){
		var email = $(this).find('input[name="email"]').val().trim();
		var password = $(this).find('input[name="password"]').val().trim();
		
		$.getJSON(getRootPath() + 'data/index.php', {
			act: 'login',
			email: email,
			password: password
		}, function(res) {
			if (res && res.code === 1) {
				showToast(res.msg);
				$('#authModal').removeClass('active');
				renderUserHeader(res.user);
				syncLocalHistoryToCloud(); // 登录成功，立即同步本地记录并覆盖
				setTimeout(function(){ location.reload(); }, 1000); // 重新加载刷新页面状态
			} else {
				showToast(res.msg, 'error');
			}
		});
	});

	// 注册表单提交
	$(document).on('submit', '#registerForm', function(){
		var nickname = $(this).find('input[name="nickname"]').val().trim();
		var email = $(this).find('input[name="email"]').val().trim();
		var code = $(this).find('input[name="code"]').val().trim();
		var password = $(this).find('input[name="password"]').val().trim();

		$.getJSON(getRootPath() + 'data/index.php', {
			act: 'register',
			nickname: nickname,
			email: email,
			code: code,
			password: password
		}, function(res) {
			if (res && res.code === 1) {
				showToast(res.msg);
				$('#authModal').removeClass('active');
				renderUserHeader(res.user);
				syncLocalHistoryToCloud();
				setTimeout(function(){ location.reload(); }, 1000);
			} else {
				showToast(res.msg, 'error');
			}
		});
	});

	// 登出事件绑定
	$(document).on('click', '#logoutBtn', function(){
		$.getJSON(getRootPath() + 'data/index.php', { act: 'logout' }, function(res) {
			showToast('已安全退出登录');
			setTimeout(function(){ location.href = getRootPath(); }, 1000);
		});
	});

	// 展开和隐藏个人下拉项
	$(document).on('click', '#userProfileBtn', function(e){
		e.stopPropagation();
		$('#userDropdownMenu').toggle();
	});
	$(document).on('click', function(){
		$('#userDropdownMenu').hide();
	});

	// 播放历史上传同步
	function syncLocalHistoryToCloud() {
		var localHistory = [];
		try {
			localHistory = JSON.parse(localStorage.getItem('fate_play_history') || '[]');
		} catch(e){}

		if (localHistory.length === 0) {
			// 如果本地为空，直接从云端拉取覆盖本地
			$.getJSON(getRootPath() + 'data/index.php', { act: 'history_sync' }, function(res) {
				if (res && res.code === 1 && res.history) {
					localStorage.setItem('fate_play_history', JSON.stringify(res.history));
				}
			});
			return;
		}

		// 本地有历史，发起合并同步
		$.post(getRootPath() + 'data/index.php?act=history_sync', {
			items: JSON.stringify(localHistory)
		}, function(res) {
			var parsed = typeof res === 'string' ? JSON.parse(res) : res;
			if (parsed && parsed.code === 1 && parsed.history) {
				// 将服务器云端合并后的最终历史记录同步回本地缓存，保障多端一致
				localStorage.setItem('fate_play_history', JSON.stringify(parsed.history));
			}
		}, 'json');
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