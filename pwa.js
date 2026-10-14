(function () {
  'use strict';
  var panel = document.getElementById('pwa-install');
  var button = document.getElementById('pwa-install-button');
  var message = document.getElementById('pwa-install-message');
  var pendingPrompt = null;
  var guide = document.getElementById('pwa-install-guide');
  var guideClose = document.getElementById('pwa-install-guide-close');
  var guideDone = document.getElementById('pwa-install-guide-done');
  var guideSteps = document.getElementById('pwa-install-guide-steps');
  var guideNote = document.getElementById('pwa-install-guide-note');
  var previousFocus = null;
  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var safari = /Safari/.test(ua) && /Version\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Edg\/|OPR\/|Android/.test(ua);
  var macSafari = safari && !ios && /Macintosh|Mac OS X/.test(ua);
  var manual = ios || macSafari;
  var dismissedKey = 'futari_install_guide_dismissed';
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function dismissed() { try { return sessionStorage.getItem(dismissedKey) === 'yes'; } catch (e) { return false; } }
  function closeGuide() {
    if (!guide || guide.hidden) return;
    guide.hidden = true;
    try { sessionStorage.setItem(dismissedKey, 'yes'); } catch (e) { /* private mode still allows dismissing this popup */ }
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }
  function openGuide() {
    if (!guide || standalone()) return;
    previousFocus = document.activeElement;
    guide.hidden = false;
    if (guideClose && guideClose.focus) guideClose.focus();
  }
  if (manual && guideSteps) {
    if (macSafari) {
      guideSteps.innerHTML = '<li>Safari 메뉴에서 <strong>파일</strong>을 열어요.</li><li><strong>Dock에 추가</strong>를 선택해요.</li><li>이름을 확인하고 <strong>추가</strong>를 눌러요.</li>';
      guideNote.textContent = 'macOS Sonoma 이상에서 사용할 수 있어요. Dock에서 futari를 열어주세요.';
    } else if (!safari) {
      guideNote.textContent = '홈 화면에 추가 메뉴가 없다면 이 주소를 Safari에서 열고 아래 순서대로 진행해주세요.';
    }
  }
  if (manual && !standalone()) {
    panel.hidden = false;
    message.textContent = 'futari를 앱처럼 홈 화면에서 열어요';
    button.textContent = '앱 설치 안내';
    if (safari && !dismissed()) openGuide();
  }
  if (guideClose) guideClose.addEventListener('click', closeGuide);
  if (guideDone) guideDone.addEventListener('click', closeGuide);
  if (guide) {
    guide.addEventListener('click', function (event) { if (event.target === guide) closeGuide(); });
    guide.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); closeGuide(); }
      if (event.key === 'Tab' && guideClose && guideDone) {
        if (event.shiftKey && document.activeElement === guideClose) { event.preventDefault(); guideDone.focus(); }
        else if (!event.shiftKey && document.activeElement === guideDone) { event.preventDefault(); guideClose.focus(); }
      }
    });
  }
  window.addEventListener('beforeinstallprompt', function (event) {
    if (standalone()) return;
    event.preventDefault(); pendingPrompt = event;
    panel.hidden = false; button.disabled = false; button.hidden = false; button.textContent = '앱 설치';
  });
  button.addEventListener('click', function () {
    if (standalone()) return;
    if (!pendingPrompt) { if (manual) openGuide(); return; }
    var prompt = pendingPrompt; pendingPrompt = null; button.disabled = true;
    Promise.resolve().then(function () { return prompt.prompt(); }).then(function () { return prompt.userChoice; }).then(function () {
      panel.hidden = true;
    }).catch(function () {
      button.hidden = true; message.textContent = '크롬 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해주세요.';
    });
  });
  function hideInstall() {
    pendingPrompt = null; panel.hidden = true;
    if (guide && !guide.hidden) closeGuide();
  }
  window.addEventListener('appinstalled', hideInstall);
  var displayMode = window.matchMedia('(display-mode: standalone)');
  if (displayMode.addEventListener) displayMode.addEventListener('change', function () { if (standalone()) hideInstall(); });
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
    if (!window.confirm('새 버전으로 다시 열까요? 저장된 게임 진행은 유지됩니다.')) return;
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
