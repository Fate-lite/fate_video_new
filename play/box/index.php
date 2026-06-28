<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="renderer" content="webkit">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>播放</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
#artplayer{width:100vw;height:100vh}
#loading{position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:#000;z-index:9999;flex-direction:column}
#loading .spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.12);border-top-color:rgba(90,79,207,.8);border-radius:50%;animation:spin .7s linear infinite;margin-bottom:12px}
#loading .txt{color:rgba(255,255,255,.5);font:14px/1 system-ui,sans-serif}
@keyframes spin{to{transform:rotate(360deg)}}
.err{color:#f87171!important}
</style>
</head>
<body>
<div id="loading"><div class="spinner"></div><span class="txt">正在加载播放器...</span></div>
<div id="artplayer"></div>

<script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.11/dist/hls.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/artplayer@5.4.0/dist/artplayer.min.js"></script>
<script>
var LOADING = document.getElementById('loading');
var TXT = LOADING.querySelector('.txt');

function showError(msg) {
    TXT.textContent = msg;
    TXT.className = 'txt err';
}

function hideLoading() {
    LOADING.style.display = 'none';
}

var sp = new URLSearchParams(location.search);
var src = sp.get('src');

if (!src) {
    showError('无播放地址');
} else if (/\.(m3u8|mp4)(?:[?#]|$)/i.test(src)) {
    try {
        var art = new Artplayer({
            container: '#artplayer',
            url: src,
            autoplay: true,
            currentTime: parseInt(sp.get('progress') || '0'),
            autoSize: false,
            fullscreen: true,
            pip: true,
            screenshot: true,
            setting: true,
            flip: true,
            playbackRate: true,
            aspectRatio: true,
            theme: '#5a4fcf',
            lang: 'zh-cn',
            miniProgressBar: true,
            moreVideoAttr: {
                playsinline: true,
                'webkit-playsinline': true,
                'x5-video-player-type': 'h5',
                muted: false,
                preload: 'auto'
            },
            customType: {
                m3u8: function(video, url, artInstance) {
                    if (Hls.isSupported()) {
                        var hls = new Hls({
                            maxBufferLength: 60,
                            maxMaxBufferLength: 120,
                            backBufferLength: 30,
                            fragLoadingTimeOut: 8000,
                            manifestLoadingTimeOut: 6000,
                            levelLoadingTimeOut: 6000,
                            fragLoadingMaxRetry: 6,
                            manifestLoadingMaxRetry: 4,
                            fragLoadingRetryDelay: 100,
                            enableWorker: true,
                            enableSoftwareAES: false,
                            startFragPrefetch: true,
                            testBandwidth: true,
                            maxBufferHole: 0.8,
                            maxFragLookUpTolerance: 0.4,
                            highBufferWatchdogPeriod: 1,
                            abrEwmaDefaultEstimate: 6000000,
                            abrEwmaFastVoD: 1000000,
                            abrEwmaSlowVoD: 150000,
                            maxStarvationDelay: 4,
                            capLevelToPlayerSize: true,
                            autoStartLoad: true,
                            startLevel: -1,
                            lowLatencyMode: false,
                            maxBufferSize: 60000000,
                            defaultAudioCodec: 'mp4a.40.2'
                        });
                        video._hlsRef = hls;
                        hls.loadSource(url);
                        hls.attachMedia(video);
                        hls.on(Hls.Events.MANIFEST_PARSED, function() {
                            if (hls.levels && hls.levels.length > 0) {
                                hls.currentLevel = hls.levels.length - 1;
                            }
                            hideLoading();
                        });
                        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, function() {
                            if (!hls.audioTracks || !hls.audioTracks.length) return;
                            for (var i = 0, n = 0; i < hls.audioTracks.length; i++) {
                                var t = hls.audioTracks[i];
                                var l = (t.lang || '').toLowerCase();
                                var a = (t.name || '').toLowerCase();
                                if (l.includes('zh') || l.includes('chi') || a.includes('中文') || a.includes('国语') || a.includes('main')) {
                                    n = i;
                                    break;
                                }
                            }
                            hls.audioTrack = n;
                        });
                        hls.on(Hls.Events.ERROR, function(e, d) {
                            if (d.fatal) {
                                if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                    hls.destroy();
                                    showError('网络加载失败，请重试');
                                } else {
                                    hls.recoverMediaError();
                                }
                            }
                        });
                        artInstance.on('destroy', function() {
                            hls.destroy();
                        });
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                        video.addEventListener('loadedmetadata', function() {
                            video.play().catch(function() {});
                            hideLoading();
                        });
                    }
                }
            }
        });
        art.on('ready', function() {
            hideLoading();
            
            var lastReportTime = 0;
            art.on('video:timeupdate', function() {
                var curr = Math.floor(art.video.currentTime);
                if (curr !== lastReportTime && curr % 3 === 0) {
                    lastReportTime = curr;
                    window.parent.postMessage({ event: 'timeupdate', currentTime: curr }, '*');
                }
            });
            
            art.on('video:ended', function() {
                window.parent.postMessage({ event: 'ended' }, '*');
            });
        });
        art.on('error', function() {
            showError('播放失败，请尝试切换其他线路');
            window.parent.postMessage({ event: 'error' }, '*');
        });
    } catch (e) {
        showError('播放器初始化失败: ' + e.message);
    }
} else {
    // 网页/云播播放源，直接全屏 iframe 载入
    var frame = document.createElement('iframe');
    frame.src = src;
    frame.style.width = '100vw';
    frame.style.height = '100vh';
    frame.style.border = '0';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    
    var container = document.getElementById('artplayer');
    container.innerHTML = '';
    container.appendChild(frame);
    
    frame.onload = function() {
        hideLoading();
    };
    setTimeout(hideLoading, 3000);
}
</script>
</body>
</html>