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
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).catch(function (error) {
        console.warn('futari offline setup failed', error);
      });
    });
  }
})();
