/* This entry point is deliberately outside the cached shell of older versions. */
(function () {
  'use strict';
  var base = new URL('./', window.location.href);
  var button = document.getElementById('recover');
  var status = document.getElementById('status');
  var link = document.getElementById('open-app');
  var files = ['index.html','app.js','home.js','games.js','board-games.js','game.css','config.js','pwa.js',
    'manifest.webmanifest','vendor/react.js','vendor/react-dom.js','vendor/supabase.js',
    'icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'];
  function belongsToApp(key) {
    return key.startsWith('futari-shell-' + encodeURIComponent(base.pathname) + '-') || /^futari-shell-v\d+$/.test(key);
  }
  async function recover() {
    var room = localStorage.getItem('futari_room_code');
    var cached = room && JSON.parse(localStorage.getItem('futari_cache_' + room) || 'null');
    if (cached && cached.pending) throw new Error('아직 저장하지 못한 변경이 있어요. 기존 앱에서 저장을 완료한 뒤 다시 눌러주세요.');
    var stamp = String(Date.now());
    // Query strings bypass older cache-first workers; fetch is not a navigation.
    // Verify all downloads before changing any app caches.
    var downloaded = await Promise.all(files.map(async function (file) {
      var url = new URL(file, base); url.searchParams.set('futari_recovery', stamp);
      var response = await fetch(url.href, { cache: 'no-store' });
      if (!response.ok) throw new Error('배포된 파일을 받지 못했어요 (' + file + '). GitHub Pages 배포가 끝난 뒤 다시 시도해주세요.');
      if (file === 'index.html' && !(await response.clone().text()).includes('name="futari-build"')) throw new Error('아직 최신 버전이 배포되지 않았어요. GitHub Pages 배포가 끝난 뒤 다시 시도해주세요.');
      var type = response.headers.get('content-type') || '';
      if (file !== 'index.html' && type.includes('text/html')) throw new Error('앱 파일 대신 오류 페이지가 내려왔어요. 배포 상태를 확인해주세요.');
      return { key: new URL(file, base).href, response: response };
    }));
    var names = (await caches.keys()).filter(belongsToApp);
    if (!names.length) names.push('futari-shell-' + encodeURIComponent(base.pathname) + '-recovered');
    // Refresh existing cache names so even an old active worker serves fresh files.
    for (var name of names) {
      var cache = await caches.open(name);
      await Promise.all(downloaded.map(function (asset) { return cache.put(asset.key, asset.response.clone()); }));
    }
    return true;
  }
  button.addEventListener('click', async function () {
    button.disabled = true; status.textContent = '최신 앱 파일을 확인하고 있어요…';
    try {
      await recover();
      status.textContent = '최신 화면을 받았어요. 아래 링크로 다시 열고, 설치 앱도 다시 실행해주세요.';
      link.hidden = false;
    } catch (error) {
      status.textContent = error.message || '화면을 받지 못했어요. 연결을 확인하고 다시 시도해주세요.';
    } finally { button.disabled = false; }
  });
  window.FutariRecovery = { recover: recover, belongsToApp: belongsToApp };
})();
