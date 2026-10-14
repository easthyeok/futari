(function () {
  'use strict';
  var panel = document.getElementById('pwa-install');
  var button = document.getElementById('pwa-install-button');
  var message = document.getElementById('pwa-install-message');
  var pendingPrompt = null;
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  window.addEventListener('beforeinstallprompt', function (event) {
    if (standalone()) return;
    event.preventDefault(); pendingPrompt = event;
    panel.hidden = false; button.disabled = false;
  });
  button.addEventListener('click', function () {
    if (!pendingPrompt) return;
    var prompt = pendingPrompt; pendingPrompt = null; button.disabled = true;
    Promise.resolve().then(function () { return prompt.prompt(); }).then(function () { return prompt.userChoice; }).then(function () {
      panel.hidden = true;
    }).catch(function () {
      button.hidden = true; message.textContent = '크롬 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해주세요.';
    });
  });
  window.addEventListener('appinstalled', function () { pendingPrompt = null; panel.hidden = true; });
  var updatePanel = document.getElementById('pwa-update');
  var updateButton = document.getElementById('pwa-update-button');
  var updateMessage = document.getElementById('pwa-update-message');
  var registration = null, applying = false;
  function hasPendingChanges() {
    try {
      var room = localStorage.getItem('futari_room_code');
      var cached = room && JSON.parse(localStorage.getItem('futari_cache_' + room) || 'null');
      return !!(cached && cached.pending);
    } catch (e) { return true; }
  }
  function showUpdate() {
    if (registration && registration.waiting) updatePanel.hidden = false;
  }
  function checkUpdate() {
    if (!registration || !navigator.onLine) return;
    registration.update().then(showUpdate).catch(function () {});
  }
  updateButton.addEventListener('click', function () {
    if (!registration || !registration.waiting || applying) return;
    if (hasPendingChanges()) {
      updateMessage.textContent = '변경을 저장한 뒤 다시 눌러주세요';
      return;
    }
    if (!window.confirm('새 버전으로 다시 열까요? 바운스오프의 현재 경기는 초기화됩니다.')) return;
    applying = true; updateButton.disabled = true;
    updateMessage.textContent = '새 버전으로 전환하고 있어요…';
    registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
  });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // Reload only this tab, after its user has chosen to apply the update.
      if (applying) { applying = false; window.location.reload(); }
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(function (reg) {
        registration = reg; showUpdate();
        reg.addEventListener('updatefound', function () {
          var installing = reg.installing;
          if (installing) installing.addEventListener('statechange', function () { if (installing.state === 'installed') showUpdate(); });
        });
      }).catch(function (error) {
        console.warn('futari offline setup failed', error);
      });
    });
    window.addEventListener('focus', checkUpdate);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') checkUpdate(); });
  }
})();
