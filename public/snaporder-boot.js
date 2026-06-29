(function () {
  var bootScript = document.currentScript;
  var appSrc = bootScript && bootScript.getAttribute("data-app-src");
  if (!appSrc) return;

  function showBootError(message) {
    var el = document.getElementById("boot-fallback");
    if (!el) return;
    el.innerHTML =
      '<div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;color:#fff;background:#5F0504">' +
      '<p style="font-size:18px;font-weight:700;margin:0 0 12px">Kebab Turco</p>' +
      '<p style="font-size:14px;opacity:0.85;margin:0 0 20px;max-width:320px">' +
      message +
      "</p>" +
      '<button type="button" id="boot-reload-btn" style="background:#fff;color:#5F0504;border:none;border-radius:999px;padding:12px 24px;font-weight:700;font-size:14px">Actualizar</button>' +
      "</div>";
    var btn = document.getElementById("boot-reload-btn");
    if (btn) btn.addEventListener("click", function () { window.location.reload(); });
  }

  function isLovableEditorHost() {
    try {
      var host = (location.hostname || "").replace(/^www\./i, "").toLowerCase();
      return (
        host.slice(-17) === ".lovableproject.com" ||
        host.slice(-11) === ".lovable.app" ||
        host.slice(-11) === ".lovable.dev"
      );
    } catch (e) {
      return false;
    }
  }

  function isStandalone() {
    try {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
      );
    } catch (e) {
      return false;
    }
  }

  function isCapacitorNative() {
    try {
      var cap = window.Capacitor;
      if (cap && cap.isNativePlatform && cap.isNativePlatform()) return true;
      return /KebabTurcoCapacitor/i.test(window.navigator && window.navigator.userAgent || "");
    } catch (e) {
      return false;
    }
  }

  function shouldKeepSw(reg, preservePush) {
    if (!preservePush) return false;
    try {
      var url =
        (reg.active && reg.active.scriptURL) ||
        (reg.installing && reg.installing.scriptURL) ||
        (reg.waiting && reg.waiting.scriptURL) ||
        "";
      return url.indexOf("push-handler") !== -1;
    } catch (e) {
      return false;
    }
  }

  function purgeCaches(preservePush) {
    var tasks = [];
    if ("serviceWorker" in navigator) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(
            regs.map(function (r) {
              return shouldKeepSw(r, preservePush) ? Promise.resolve() : r.unregister();
            }),
          );
        }),
      );
    }
    if ("caches" in window) {
      tasks.push(
        caches.keys().then(function (keys) {
          return Promise.all(
            keys.map(function (k) {
              return caches.delete(k);
            }),
          );
        }),
      );
    }
    return Promise.all(tasks).catch(function () {});
  }

  function withBootCacheBust(src) {
    try {
      var build = document.querySelector('meta[name="app-build-id"]');
      var token = build && build.getAttribute("content") || String(Date.now());
      return src + (src.indexOf("?") === -1 ? "?" : "&") + "boot=" + encodeURIComponent(token);
    } catch (e) {
      return src;
    }
  }

  function scheduleBootTimeout(ms) {
    if (window.__SNAPORDER_BOOT_TIMEOUT__) {
      window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
    }
    window.__SNAPORDER_BOOT_TIMEOUT__ = window.setTimeout(function () {
      if (!window.__SNAPORDER_APP_READY__) {
        showBootError("A app está a demorar a abrir. Toque em Actualizar.");
      }
    }, ms);
  }

  function bootTimeoutMs() {
    return isLovableEditorHost() ? 120000 : 30000;
  }

  function loadApp() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", loadApp, { once: true });
      return;
    }

    window.__SNAPORDER_MAIN__ = appSrc;

    if (isStandalone()) {
      document.documentElement.classList.add("pwa-standalone");
    }

    var script = document.createElement("script");
    script.type = "module";
    script.src = withBootCacheBust(appSrc);
    script.onerror = function () {
      if (window.__SNAPORDER_BOOT_TIMEOUT__) {
        window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
      }
      showBootError("Não foi possível abrir o menu. Toque em Actualizar.");
    };
    script.onload = function () {
      if (window.__SNAPORDER_APP_READY__) {
        if (window.__SNAPORDER_BOOT_TIMEOUT__) {
          window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
        }
        return;
      }
      scheduleBootTimeout(isLovableEditorHost() ? 90000 : 20000);
    };
    document.body.appendChild(script);

    scheduleBootTimeout(bootTimeoutMs());
  }

  function loadAfterPurge(preservePush, timeoutMs) {
    var loaded = false;
    function once() {
      if (loaded) return;
      loaded = true;
      loadApp();
    }
    window.setTimeout(once, timeoutMs || 2500);
    purgeCaches(preservePush).then(once).catch(once);
  }

  if (isLovableEditorHost()) {
    loadApp();
  } else if (isCapacitorNative()) {
    // No IPA/TestFlight não pode existir Service Worker antigo do PWA a servir bundles/cache antigos.
    loadAfterPurge(false, 2000);
  } else {
    loadAfterPurge(true, 1200);
  }
})();
