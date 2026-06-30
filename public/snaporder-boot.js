(function () {
  var bootScript = document.currentScript;
  var appSrc = bootScript && bootScript.getAttribute("data-app-src");
  if (!appSrc) return;

  function buildTag() {
    try {
      var meta = document.querySelector('meta[name="app-build-id"]');
      if (meta && meta.content) return meta.content;
    } catch (e) {}
    return String(Date.now());
  }

  function withCacheBust(src) {
    var sep = src.indexOf("?") === -1 ? "?" : "&";
    return src + sep + "v=" + encodeURIComponent(buildTag());
  }

  function showBootLoading() {
    var el = document.getElementById("boot-fallback");
    if (!el || el.dataset.loading === "1") return;
    el.dataset.loading = "1";
    // Mantém apenas o fundo (sem texto "Kebab Turco / A abrir…") para evitar
    // o "flash" da tela vermelha em arranques rápidos. O texto só aparece
    // se o arranque demorar mais de 1.2s (ver scheduleBootLoadingText).
    el.innerHTML =
      '<div id="boot-fallback-inner" style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;color:#fff;background:#5F0504;opacity:0;transition:opacity 200ms ease">' +
      '<p style="font-size:18px;font-weight:700;margin:0 0 12px">Kebab Turco</p>' +
      '<p style="font-size:14px;opacity:0.85;margin:0">A abrir…</p>' +
      "</div>";
    if (window.__SNAPORDER_BOOT_TEXT_TIMER__) {
      window.clearTimeout(window.__SNAPORDER_BOOT_TEXT_TIMER__);
    }
    window.__SNAPORDER_BOOT_TEXT_TIMER__ = window.setTimeout(function () {
      var inner = document.getElementById("boot-fallback-inner");
      if (inner) inner.style.opacity = "1";
    }, 1200);
  }


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

  function dismissBootFallback() {
    var el = document.getElementById("boot-fallback");
    if (!el || el.dataset.dismissed === "1") return;
    el.dataset.dismissed = "1";
    try {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      });
    } catch (e) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
  }

  function rootSeemsRendered() {
    var root = document.getElementById("root");
    if (!root) return false;
    try {
      return root.childNodes && root.childNodes.length > 0;
    } catch (e) {
      return false;
    }
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
      return !!(cap && cap.isNativePlatform && cap.isNativePlatform());
    } catch (e) {
      return false;
    }
  }

  function purgeCaches(opts) {
    var options = opts || {};
    var keepPushHandler = options.keepPushHandler === true;
    var tasks = [];
    if ("serviceWorker" in navigator) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(
            regs.map(function (r) {
              if (keepPushHandler) {
                try {
                  var url =
                    (r.active && r.active.scriptURL) ||
                    (r.installing && r.installing.scriptURL) ||
                    (r.waiting && r.waiting.scriptURL) ||
                    "";
                  if (url.indexOf("push-handler") !== -1) return Promise.resolve();
                } catch (e) {}
              }
              return r.unregister();
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

  function bootShellVisible() {
    var el = document.getElementById("boot-fallback");
    return !!(el && el.dataset.dismissed !== "1" && el.parentNode);
  }

  function scheduleBootTimeout(ms) {
    if (window.__SNAPORDER_BOOT_TIMEOUT__) {
      window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
    }
    window.__SNAPORDER_BOOT_TIMEOUT__ = window.setTimeout(function () {
      if (bootShellVisible()) {
        showBootError("A app está a demorar a abrir. Toque em Actualizar.");
      }
    }, ms);
  }

  function watchAppReady() {
    var tries = 0;
    var maxTries = 240; // ~120s
    function tick() {
      if (window.__SNAPORDER_APP_READY__) {
        if (window.__SNAPORDER_BOOT_TIMEOUT__) {
          window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
        }
        dismissBootFallback();
        return;
      }
      tries += 1;
      if (tries < maxTries) {
        window.setTimeout(tick, 500);
      }
    }
    tick();
  }

  function watchRootRender() {
    var tries = 0;
    var maxTries = 120; // ~60s
    function tick() {
      if (window.__SNAPORDER_APP_READY__ || rootSeemsRendered()) {
        if (window.__SNAPORDER_BOOT_TIMEOUT__) {
          window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
        }
        dismissBootFallback();
        return;
      }
      tries += 1;
      if (tries < maxTries) {
        window.setTimeout(tick, 500);
      }
    }
    tick();
  }

  function bootTimeoutMs() {
    if (isLovableEditorHost()) return 120000;
    if (isCapacitorNative()) return 120000;
    return 45000;
  }

  function renderTimeoutMs() {
    if (isCapacitorNative()) return 90000;
    if (isLovableEditorHost()) return 90000;
    return 25000;
  }

  function loadApp() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", loadApp, { once: true });
      return;
    }

    window.__SNAPORDER_MAIN__ = appSrc;
    showBootLoading();

    if (isStandalone()) {
      document.documentElement.classList.add("pwa-standalone");
    }

    var script = document.createElement("script");
    script.type = "module";
    script.src = withCacheBust(appSrc);
    script.onerror = function () {
      if (window.__SNAPORDER_BOOT_TIMEOUT__) {
        window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
      }
      showBootError("Não foi possível abrir o menu. Toque em Actualizar.");
    };
    script.onload = function () {
      if (window.__SNAPORDER_APP_READY__ || rootSeemsRendered()) {
        if (window.__SNAPORDER_BOOT_TIMEOUT__) {
          window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
        }
        dismissBootFallback();
        return;
      }
      if (!bootShellVisible()) {
        if (window.__SNAPORDER_BOOT_TIMEOUT__) {
          window.clearTimeout(window.__SNAPORDER_BOOT_TIMEOUT__);
        }
        return;
      }
      scheduleBootTimeout(renderTimeoutMs());
    };
    document.body.appendChild(script);

    scheduleBootTimeout(bootTimeoutMs());
    watchAppReady();
    watchRootRender();
  }

  if (isCapacitorNative()) {
    // iOS TestFlight: limpa TODOS os SW/cache antigos antes de boot.
    purgeCaches({ keepPushHandler: false }).finally(loadApp);
  } else if (isLovableEditorHost()) {
    loadApp();
  } else {
    loadApp();
    purgeCaches({ keepPushHandler: true });
  }
})();
