(function(){
	if(!document.getElementById('playerBox')) return;
	if(typeof fromData === 'undefined' || !fromData) return;

	var epGrid = document.getElementById('episodesGrid');
	var epWrap = document.getElementById('episodesWrap');
	var playerFrame = document.getElementById('playerFrame');
	var playerLoading = document.getElementById('playerLoading');
	var currentUrl = '';

	var sp = new URLSearchParams(location.search);
	var currentVid = sp.get('vid') || '';
	
	// 本地存储 key
	var historyKey = 'fate_play_history';
	var watchedKey = 'fate_watched_episodes';

	// 保存播放历史记录
	function savePlayHistory(episodeName, siteName){
		if(!currentVid || !fromData || !fromData.title) return;
		var list = [];
		try {
			list = JSON.parse(localStorage.getItem(historyKey) || '[]');
		} catch(e){}
		
		list = list.filter(function(item){
			return item.vid !== currentVid;
		});
		
		list.unshift({
			vid: currentVid,
			title: fromData.title,
			pic: fromData.pic || '',
			episode: episodeName || '正片',
			site: siteName || '',
			time: Date.now(),
			progress: 0
		});
		
		if(list.length > 20){
			list = list.slice(0, 20);
		}
		localStorage.setItem(historyKey, JSON.stringify(list));
	}

	// 实时更新当前集播放进度(秒数)
	function updatePlayProgress(progress){
		if(!currentVid) return;
		var list = [];
		try {
			list = JSON.parse(localStorage.getItem(historyKey) || '[]');
		} catch(e){}
		var item = list.find(function(x){ return x.vid === currentVid; });
		if(item){
			item.progress = progress;
			localStorage.setItem(historyKey, JSON.stringify(list));
		}
	}

	// 标记集数为“已看”
	function markEpisodeWatched(episodeName){
		if(!currentVid || !episodeName) return;
		var data = {};
		try {
			data = JSON.parse(localStorage.getItem(watchedKey) || '{}');
		} catch(e){}
		if(!data[currentVid]){
			data[currentVid] = [];
		}
		if(data[currentVid].indexOf(episodeName) === -1){
			data[currentVid].push(episodeName);
			localStorage.setItem(watchedKey, JSON.stringify(data));
		}
	}

	// 播放指定的播放源 URL
	function playUrl(url){
		if(!url) return;
		currentUrl = url;
		playerLoading.style.display = 'flex';
		
		// 尝试从历史中恢复当前集数进度
		var progress = 0;
		try {
			var list = JSON.parse(localStorage.getItem(historyKey) || '[]');
			var item = list.find(function(x){ return x.vid === currentVid; });
			var activeBtn = epGrid.querySelector('.ep-btn.active');
			var currentEpName = activeBtn ? activeBtn.textContent : '正片';
			if(item && item.episode === currentEpName){
				progress = item.progress || 0;
			}
		} catch(e){}
		
		playerFrame.src = './box/?src=' + encodeURIComponent(url) + '&progress=' + progress;
		playerFrame.onload = function(){ playerLoading.style.display = 'none'; };
	}

	// 渲染集数列表并做折叠与分页处理
	function renderEpisodes(episodes, siteName){
		if(!episodes || !episodes[siteName]) return;
		var epList = episodes[siteName];
		var sorted = [];
		for(var k in epList){
			sorted.push({name:k, url:epList[k]});
		}
		
		sorted.sort(function(a,b){
			var na = parseInt((a.name.match(/(\d+)/)||['','0'])[1]);
			var nb = parseInt((b.name.match(/(\d+)/)||['','0'])[1]);
			return na - nb;
		});

		// 查找切换前页面上已高亮的集数名称和集数索引，用于线路切换时同步集数
		var prevActiveBtn = epGrid.querySelector('.ep-btn.active');
		var prevActiveName = prevActiveBtn ? prevActiveBtn.textContent : '';
		var prevActiveIndex = prevActiveBtn ? Array.from(epGrid.querySelectorAll('.ep-btn')).indexOf(prevActiveBtn) : -1;

		// 检查本地历史以确定高亮集数
		var myHistory = null;
		try {
			var localHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
			myHistory = localHistory.find(function(item){ return item.vid === currentVid; });
		} catch(e){}

		var defaultActiveName = sorted[0] ? sorted[0].name : '';
		
		if (prevActiveName) {
			// 1. 优先尝试精确匹配切换前的集数名称
			var matchedItem = sorted.find(function(item){ return item.name === prevActiveName; });
			
			// 2. 提取数字模糊匹配 (例如："第02集" 与 "第002集" 或 "2" 匹配)
			if (!matchedItem) {
				var prevNumMatch = prevActiveName.match(/(\d+)/);
				if (prevNumMatch) {
					var prevNum = parseInt(prevNumMatch[1], 10);
					matchedItem = sorted.find(function(item){
						var itemNumMatch = item.name.match(/(\d+)/);
						return itemNumMatch && parseInt(itemNumMatch[1], 10) === prevNum;
					});
				}
			}
			
			// 3. 兜底尝试相同位置索引匹配
			if (!matchedItem && prevActiveIndex !== -1 && sorted[prevActiveIndex]) {
				matchedItem = sorted[prevActiveIndex];
			}
			
			if (matchedItem) {
				defaultActiveName = matchedItem.name;
			}
		} else if (myHistory) {
			// 没有正在播放的集数，退回到历史记录匹配（同样支持数字模糊匹配）
			var matchedItem = sorted.find(function(item){ return item.name === myHistory.episode; });
			if (!matchedItem) {
				var histNumMatch = myHistory.episode.match(/(\d+)/);
				if (histNumMatch) {
					var histNum = parseInt(histNumMatch[1], 10);
					matchedItem = sorted.find(function(item){
						var itemNumMatch = item.name.match(/(\d+)/);
						return itemNumMatch && parseInt(itemNumMatch[1], 10) === histNum;
					});
				}
			}
			if (matchedItem) {
				defaultActiveName = matchedItem.name;
			}
		}

		// 计算最长集数名称字数，自适应动态网格列宽
		var maxLen = 0;
		sorted.forEach(function(item){
			if(item.name && item.name.length > maxLen) {
				maxLen = item.name.length;
			}
		});
		epGrid.className = 'episodes-grid';
		if(maxLen > 8) {
			epGrid.classList.add('ep-grid-super-long');
		} else if(maxLen > 4) {
			epGrid.classList.add('ep-grid-long');
		}

		// 获取已看集数
		var watchedList = [];
		try {
			var watchedData = JSON.parse(localStorage.getItem(watchedKey) || '{}');
			watchedList = watchedData[currentVid] || [];
		} catch(e){}

		// 清理可能已有的分页页码
		var oldPages = epWrap.querySelector('.ep-pages');
		if(oldPages) oldPages.remove();

		// 集数分段折叠逻辑
		var itemsPerPage = 30;
		var isPaged = sorted.length > 24;
		var activePageIndex = 0;

		if(isPaged){
			// 确定活跃集数应该处于哪个分页区间
			for(var i = 0; i < sorted.length; i++){
				if(sorted[i].name === defaultActiveName){
					activePageIndex = Math.floor(i / itemsPerPage);
					break;
				}
			}
			
			// 创建分页容器
			var pagesContainer = document.createElement('div');
			pagesContainer.className = 'ep-pages';
			
			var pageCount = Math.ceil(sorted.length / itemsPerPage);
			for(var p = 0; p < pageCount; p++){
				(function(pageIdx){
					var pageBtn = document.createElement('button');
					pageBtn.className = 'ep-page-btn' + (pageIdx === activePageIndex ? ' active' : '');
					
					var startEp = pageIdx * itemsPerPage + 1;
					var endEp = Math.min((pageIdx + 1) * itemsPerPage, sorted.length);
					pageBtn.textContent = startEp + '-' + endEp;
					
					pageBtn.onclick = function(){
						document.querySelectorAll('.ep-page-btn').forEach(function(b){b.classList.remove('active')});
						pageBtn.classList.add('active');
						showPage(pageIdx);
					};
					pagesContainer.appendChild(pageBtn);
				})(p);
			}
			epGrid.parentNode.insertBefore(pagesContainer, epGrid);
		}

		function showPage(pageIdx){
			epGrid.innerHTML = '';
			var start = pageIdx * itemsPerPage;
			var end = Math.min(start + itemsPerPage, sorted.length);
			
			for(var i = start; i < end; i++){
				(function(ep){
					var btn = document.createElement('a');
					btn.className = 'ep-btn';
					if(ep.name === defaultActiveName){
						btn.classList.add('active');
					}
					if(watchedList.indexOf(ep.name) !== -1){
						btn.classList.add('watched');
					}
					btn.textContent = ep.name;
					btn.setAttribute('data-url', ep.url);
					btn.onclick = function(){
						document.querySelectorAll('.ep-btn.active').forEach(function(b){b.classList.remove('active')});
						btn.classList.add('active');
						playUrl(ep.url);
						savePlayHistory(ep.name, siteName);
						markEpisodeWatched(ep.name);
						btn.classList.add('watched');
					};
					epGrid.appendChild(btn);
				})(sorted[i]);
			}
		}

		if(isPaged){
			showPage(activePageIndex);
		} else {
			showPage(0);
		}

		epWrap.style.display = 'block';

		// 默认播放高亮的一集
		var activeBtn = epGrid.querySelector('.ep-btn.active');
		if(activeBtn){
			playUrl(activeBtn.getAttribute('data-url'));
			savePlayHistory(activeBtn.textContent, siteName);
		}
	}

	// 播放下一集
	function playNextEpisode(){
		var activeBtn = epGrid.querySelector('.ep-btn.active');
		if(!activeBtn) return;
		var btns = Array.from(epGrid.querySelectorAll('.ep-btn'));
		var idx = btns.indexOf(activeBtn);
		
		if(idx !== -1 && idx < btns.length - 1){
			var nextBtn = btns[idx + 1];
			nextBtn.click();
		} else {
			var activePageBtn = document.querySelector('.ep-page-btn.active');
			if(activePageBtn){
				var pageBtns = Array.from(document.querySelectorAll('.ep-page-btn'));
				var pIdx = pageBtns.indexOf(activePageBtn);
				if(pIdx !== -1 && pIdx < pageBtns.length - 1){
					var nextPageBtn = pageBtns[pIdx + 1];
					nextPageBtn.click();
					setTimeout(function(){
						var firstBtn = epGrid.querySelector('.ep-btn');
						if(firstBtn) firstBtn.click();
					}, 100);
					return;
				}
			}
			console.log('已经是最后一集');
		}
	}

	// 播放器故障自动切换至下一个播放源
	function tryAutoSwitchSource(){
		var tabs = Array.from(document.querySelectorAll('.src-tab-btn'));
		if(tabs.length <= 1) return;
		
		var activeTab = document.querySelector('.src-tab-btn.active');
		var idx = tabs.indexOf(activeTab);
		if(idx !== -1){
			var nextIdx = (idx + 1) % tabs.length;
			var nextTab = tabs[nextIdx];
			
			var activeBtn = epGrid.querySelector('.ep-btn.active');
			var currentEpName = activeBtn ? activeBtn.textContent : '';
			
			console.log('检测到当前播放源故障，正在为您自动切换到播放源：' + nextTab.textContent);
			nextTab.click(); 
		}
	}

	// 监听来自 Artplayer 播放器的消息通知
	window.addEventListener('message', function(event) {
		var data = event.data;
		if(!data) return;
		if(event.source && event.source !== document.getElementById('playerFrame').contentWindow) return;
		if(data.event === 'timeupdate') {
			updatePlayProgress(data.currentTime);
		} else if(data.event === 'ended') {
			playNextEpisode();
		} else if(data.event === 'error') {
			tryAutoSwitchSource();
		}
	});

	// 初始化
	var fromList = fromData.from || [];
	var episodes = fromData.episodes || {};

	if(fromList.length > 0){
		var firstFrom = fromList[0];
		var firstUrl = firstFrom[0] || '';
		var firstSite = firstFrom[2] || '';

		if(fromData.hasmore == 1){
			var validSites = [];
			for(var i = 0; i < fromList.length; i++){
				var siteName = fromList[i][2];
				if(siteName && episodes[siteName]){
					validSites.push(siteName);
				}
			}

			if(validSites.length > 0){
				var wrapContainer = document.createElement('div');
				wrapContainer.className = 'sources-wrap';

				var tabsContainer = document.createElement('div');
				tabsContainer.className = 'sources-tabs';
				
				// 智能选源：如果有历史播放的源且仍然有效，则默认选择它
				var activeSite = validSites[0];
				var localHistoryList = [];
				try {
					localHistoryList = JSON.parse(localStorage.getItem(historyKey) || '[]');
				} catch(e){}
				var myHist = localHistoryList.find(function(h){ return h.vid === currentVid; });
				if(myHist && myHist.site && validSites.indexOf(myHist.site) !== -1){
					activeSite = myHist.site;
				}

				// 1. 初始化移动端 Bottom Sheet Drawer (如果不存在则创建并追加至 body)
				var drawer = document.getElementById('sourcesDrawer');
				if(!drawer){
					drawer = document.createElement('div');
					drawer.id = 'sourcesDrawer';
					drawer.className = 'drawer-overlay';
					drawer.innerHTML = 
						'<div class="drawer-sheet">' +
							'<div class="drawer-handle"></div>' +
							'<div class="drawer-header">' +
								'<h3>选择播放线路</h3>' +
								'<button class="drawer-close">✕</button>' +
							'</div>' +
							'<div class="drawer-body">' +
								'<div class="drawer-grid"></div>' +
							'</div>' +
						'</div>';
					document.body.appendChild(drawer);
					
					// 绑定关闭事件
					var closeBtn = drawer.querySelector('.drawer-close');
					closeBtn.onclick = function(){
						drawer.classList.remove('active');
					};
					drawer.onclick = function(e){
						if(e.target === drawer){
							drawer.classList.remove('active');
						}
					};
					
					// 移动端下拉手势关闭
					var handle = drawer.querySelector('.drawer-handle');
					var sheet = drawer.querySelector('.drawer-sheet');
					var startY = 0;
					var currentY = 0;
					var isDragging = false;
					
					handle.addEventListener('touchstart', function(e){
						startY = e.touches[0].clientY;
						isDragging = true;
						sheet.style.transition = 'none';
					}, { passive: true });
					handle.addEventListener('touchmove', function(e){
						if(!isDragging) return;
						var deltaY = e.touches[0].clientY - startY;
						if(deltaY > 0){
							sheet.style.transform = 'translateY(' + deltaY + 'px)';
							currentY = deltaY;
						}
					}, { passive: true });
					handle.addEventListener('touchend', function(){
						if(!isDragging) return;
						isDragging = false;
						sheet.style.transition = '';
						sheet.style.transform = '';
						if(currentY > 100){
							drawer.classList.remove('active');
						}
						currentY = 0;
					});
				}

				// 渲染顶部标签按钮，并绑定事件
				validSites.forEach(function(site){
					var tabBtn = document.createElement('button');
					tabBtn.className = 'src-tab-btn' + (site === activeSite ? ' active' : '');
					tabBtn.textContent = site;
					tabBtn.onclick = function(){
						// 切换高亮
						tabsContainer.querySelectorAll('.src-tab-btn').forEach(function(b){b.classList.remove('active')});
						tabBtn.classList.add('active');
						
						// 渲染播放列表
						renderEpisodes(episodes, site);
						
						// 同步至底部抽屉中对应按钮的高亮
						var drawerBtns = drawer.querySelectorAll('.drawer-btn');
						drawerBtns.forEach(function(btn){
							if(btn.textContent === site){
								btn.classList.add('active');
							} else {
								btn.classList.remove('active');
							}
						});
						
						// 移动端下平滑滚动当前选中的标签至容器中心
						if (window.innerWidth <= 768) {
							tabBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
						}
					};
					tabsContainer.appendChild(tabBtn);
				});

				wrapContainer.appendChild(tabsContainer);

				// 创建展开/收起折叠按钮 (共用一个 DOM, PC 为旋转箭头，Mobile 为 ☰ 图标)
				var toggleBtn = document.createElement('button');
				toggleBtn.className = 'sources-toggle-btn';
				wrapContainer.appendChild(toggleBtn);

				// 获取已有的 "选集" 标题，并将其向下推，同时在其上方插入 "播放线路" 标题
				var epWrap = document.getElementById('episodesWrap');
				var epTitle = epWrap ? epWrap.querySelector('h3') : null;
				
				var sourceTitle = document.createElement('h3');
				sourceTitle.textContent = '播放线路';
				
				if (epTitle) {
					epTitle.style.marginTop = '24px';
					epTitle.parentNode.insertBefore(sourceTitle, epTitle);
					epTitle.parentNode.insertBefore(wrapContainer, epTitle);
				} else {
					epGrid.parentNode.insertBefore(wrapContainer, epGrid);
				}

				renderEpisodes(episodes, activeSite);

				// 2. 渲染底部抽屉中所有的网格按钮
				var drawerGrid = drawer.querySelector('.drawer-grid');
				drawerGrid.innerHTML = '';
				validSites.forEach(function(site, idx){
					var btn = document.createElement('button');
					btn.className = 'drawer-btn' + (site === activeSite ? ' active' : '');
					btn.textContent = site;
					btn.onclick = function(){
						// 触发对应的顶部选项卡点击事件
						var tabBtns = tabsContainer.querySelectorAll('.src-tab-btn');
						if(tabBtns[idx]){
							tabBtns[idx].click();
						}
						// 收起抽屉
						drawer.classList.remove('active');
					};
					drawerGrid.appendChild(btn);
				});

				// 3. 编写双端通用的布局控制函数 updateLayout
				function updateLayout() {
					var isMobile = window.innerWidth <= 768;
					if (isMobile) {
						// 手机端：关闭 PC 可能展开的容器属性，并关闭抽屉以防状态错误
						tabsContainer.style.height = '';
						tabsContainer.classList.remove('expanded');
						toggleBtn.classList.remove('expanded');
						
						// 手机端横向溢出检测
						var hasOverflow = tabsContainer.scrollWidth > tabsContainer.clientWidth;
						if (hasOverflow) {
							toggleBtn.style.display = 'flex';
							toggleBtn.innerHTML = '☰';
							toggleBtn.title = '选择播放线路';
							toggleBtn.onclick = function(){
								drawer.classList.add('active');
							};
						} else {
							toggleBtn.style.display = 'none';
						}
					} else {
						// PC 端：确保移动端抽屉处于关闭状态
						drawer.classList.remove('active');
						
						// PC 端的折叠与高度计算
						var wasExpanded = tabsContainer.classList.contains('expanded');
						tabsContainer.style.height = 'auto';
						var fullHeight = tabsContainer.scrollHeight;
						
						if (fullHeight > 44) {
							toggleBtn.style.display = 'flex';
							toggleBtn.innerHTML = '<span class="arrow-icon">▾</span>';
							
							toggleBtn.onclick = function(){
								if (tabsContainer.classList.contains('expanded')) {
									tabsContainer.classList.remove('expanded');
									toggleBtn.classList.remove('expanded');
									tabsContainer.style.height = '36px';
									toggleBtn.title = '展开所有线路';
								} else {
									tabsContainer.classList.add('expanded');
									toggleBtn.classList.add('expanded');
									tabsContainer.style.height = tabsContainer.scrollHeight + 'px';
									toggleBtn.title = '收起线路';
								}
							};
							
							if (wasExpanded) {
								tabsContainer.style.height = fullHeight + 'px';
								toggleBtn.classList.add('expanded');
								toggleBtn.title = '收起线路';
							} else {
								tabsContainer.style.height = '36px';
								toggleBtn.classList.remove('expanded');
								toggleBtn.title = '展开所有线路';
							}
						} else {
							toggleBtn.style.display = 'none';
							tabsContainer.style.height = 'auto';
							tabsContainer.classList.remove('expanded');
							toggleBtn.classList.remove('expanded');
						}
					}
				}

				// 延迟测量并监听窗口尺寸变化
				setTimeout(updateLayout, 150);
				window.addEventListener('resize', updateLayout);
			} else if(firstUrl){
				playUrl(firstUrl);
				savePlayHistory('正片', firstSite);
			}
		}
		else if(firstUrl){
			playUrl(firstUrl);
			savePlayHistory('正片', firstSite);
		}
	}
})();