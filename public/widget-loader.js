(function () {
  const getCurrentScript = () => {
    if (typeof document === "undefined") {
      console.error("document is not defined");
      return null;
    }

    const { currentScript } = document;
    if (currentScript instanceof HTMLScriptElement) {
      return currentScript;
    }

    const scripts = document.querySelectorAll(
      `script[src*="widget-loader.js"]`,
    );
    return scripts.length ? scripts[scripts.length - 1] : null;
  };
  const scriptEl = getCurrentScript();

  // Derive base URL from this script's src (widget-embed URL). Works for @latest, @dev, @version, or localhost.
  var assetBase = (function () {
    if (scriptEl?.src) {
      return scriptEl.src.replace(/\/[^/]*$/, "/");
    }
    return "https://unpkg.com/@eka-care/apollo-assist@latest/dist/";
  })();

  // Widget configuration
  var defaultConfig = {
    agentId:
      "MWIyOWYyNjctNjc2My00Y2QwLThjNWQtMDY1N2NiODM4MGMyIzcxNzU5MTc2ODQzNTgzOTA=", // required for nudge targeting; should be set to unique identifier for your bot/agent
    theme: "client",
    position: "bottom-right",
    scriptUrl: assetBase + "widget.js",
    cssUrl: assetBase + "assets/widget.css",
    mode: "widget", // 'widget' or 'full'
    primaryColor: "#007C9E", // optional hex color (e.g., "#007C9E") to auto-generate primary color palette
  };

  // Widget state
  var widgetState = {
    isLoaded: false,
    isVisible: false,
    instance: null,
    config: null,
    stage: 1,
    inactivityTimer: null,
    stage2Timer: null,
    firstUserMessage: null,
    isClosed: false,
    nudgeText: null, // active nudge string to display in stage-2
    nudgeDelay: 0, // seconds to wait before showing stage-2
    nudgeReady: false, // true once nudge API resolves (or fails)
  };

  // ─── Nudge helpers ────────────────────────────────────────────────────────

  var NUDGE_STORE_KEY = "eka-nudge-store"; // localStorage key

  function getNudgeStore() {
    try {
      return JSON.parse(localStorage.getItem(NUDGE_STORE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveNudgeStore(store) {
    try {
      localStorage.setItem(NUDGE_STORE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function normalizePath(path) {
    return path.replace(/\/$/, "") || "/";
  }

  // Step 1: exact match; Step 2: first-segment prefix match
  function findCachedNudge(agentId, currentUrl) {
    var store = getNudgeStore();
    var agentNudges = store[agentId];
    if (!agentNudges) return null;

    var url;
    try {
      url = new URL(currentUrl);
    } catch (e) {
      return null;
    }

    // Use url.host (hostname + port) to match how the API returns domain
    var domain = url.host;
    var path = normalizePath(url.pathname);

    var domainNudges = agentNudges[domain];
    if (!domainNudges) return null;

    // Step 1: exact path match
    if (domainNudges[path] !== undefined) {
      return { domain: domain, path: path, data: domainNudges[path] };
    }

    // Step 2: prefix match on first segment
    var segments = url.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      var searchPath = "/" + segments[0];
      var storedPaths = Object.keys(domainNudges);
      for (var i = 0; i < storedPaths.length; i++) {
        if (storedPaths[i].indexOf(searchPath) === 0) {
          return {
            domain: domain,
            path: storedPaths[i],
            data: domainNudges[storedPaths[i]],
          };
        }
      }
    }

    // Step 3: "/" wildcard — matches any path on this domain
    if (domainNudges["/"] !== undefined) {
      return { domain: domain, path: "/", data: domainNudges["/"] };
    }
    return null;
  }

  function storeNudge(agentId, domain, path, data) {
    var store = getNudgeStore();
    if (!store[agentId]) store[agentId] = {};
    if (!store[agentId][domain]) store[agentId][domain] = {};
    store[agentId][domain][path] = data;
    saveNudgeStore(store);
  }

  function clearNudgeEntry(agentId, domain, path) {
    var store = getNudgeStore();
    if (store[agentId] && store[agentId][domain]) {
      delete store[agentId][domain][path];
      saveNudgeStore(store);
    }
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getMetaTags() {
    return Array.from(document.head.querySelectorAll("meta")).map(function (m) {
      return {
        name: m.getAttribute("name") || "",
        property: m.getAttribute("property") || "",
        content: m.getAttribute("content") || "",
      };
    });
  }

  // Fetch nudge from API, store it, and resolve with { text, delay }
  function fetchNudge(agentId) {
    return fetch(
      "https://kamilah-uncensuring-cubistically.ngrok-free.dev/reloaded/med-assist/user-nudge ",
      {
        // return fetch("https://matrix.eka.care/reloaded/med-assist/user-nudge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-id": agentId,
        },
        body: JSON.stringify({
          meta_tags: getMetaTags(),
          url: window?.location?.href || "",
        }),
      },
    )
      .then(function (res) {
        if (!res.ok) throw new Error("nudge api " + res.status);
        return res.json();
      })
      .then(function (data) {
        var nudges = data?.nudges;
        if (!nudges || nudges.length === 0) {
          throw new Error("empty nudges");
        }
        var domain = data?.url_pattern?.domain || "";
        var path = normalizePath(data?.url_pattern?.path || "");
        storeNudge(agentId, domain, path, {
          nudges: nudges,
          delay: data.delay,
          expiry: data.expiry,
        });
        return { text: pickRandom(nudges), delay: data.delay };
      });
  }

  // Main entry: resolve nudge text+delay from cache or API
  function resolveNudge(agentId) {
    var now = Date.now() / 1000;
    var match = findCachedNudge(agentId, window.location.href);

    if (match) {
      if (match.data.expiry && now > match.data.expiry) {
        clearNudgeEntry(agentId, match.domain, match.path);
        // fall through to API
      } else {
        return Promise.resolve({
          text: pickRandom(match.data.nudges),
          delay: match.data.delay,
        });
      }
    }

    return fetchNudge(agentId);
  }

  // ─── End nudge helpers ───────────────────────────────────────────────────

  // Cookie utilities for medassist-preferences
  function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) {
      return parts.pop().split(";").shift();
    }
    return null;
  }

  function setCookie(name, value, days = 1) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const cookieDomain = window.location.hostname;
    document.cookie =
      name +
      "=" +
      value +
      ";expires=" +
      expires.toUTCString() +
      ";path=/; domain=" +
      cookieDomain +
      "; SameSite=Lax; " +
      " Secure;";
  }

  // Create isolated CSS with best practices
  function createIsolatedCSS() {
    var style = document.createElement("style");
    style.id = "eka-widget-styles";
    style.textContent = `
      /* Reset and base styles */
      .eka-widget-button {
        all: initial; // prevents the button from inheriting styles from the parent page
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        z-index: 2147483647;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      /* Stage 1: Icon only */
      .eka-widget-button.stage-1 {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #ffffff;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        padding: 0;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .eka-widget-button.stage-1:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      /* Stage 2: Oval with text */
      .eka-widget-button.stage-2 {
        width: 280px;
        height: 60px;
        border-radius: 30px;
        position: fixed;
        bottom: 90px;
        right: 20px;
        background: #FDE047;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        padding: 8px 8px 8px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .eka-widget-button.stage-2:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .eka-stage-2-content {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 16px;
        padding: 8px 24px 8px 8px;
      }

      .eka-stage-2-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }

      .eka-stage-2-title {
        font-size: 16px;
        font-weight: 600;
        color: #000000;
        line-height: 1.2;
        margin: 0;
      }

      .eka-stage-2-subtitle {
        font-size: 12px;
        font-weight: 400;
        color: #000000;
        line-height: 1.2;
        margin: 0;
      }

      .eka-stage-2-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #ffffff;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Stage 3: Full overlay with floating elements */
      .eka-chat-close {
        position: absolute;
        top: 2px;
        right: 8px;
        width: 12px;
        height: 12px;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        color: #666666;
        line-height: 1;
        padding: 0;
        border-radius: 50%;
        transition: background-color 0.2s ease;
      }

      .eka-chat-close:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .eka-widget-icon-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }

      /* Icon container */
      .eka-icon-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Mobile responsive styles */
      @media (max-width: 992px) {
        .eka-stage-3-overlay {
          bottom: 82px;
        }

        .eka-widget-button {
          bottom: 82px !important;
        }
      }

      @media (max-width: 767px) {
        .eka-stage-3-overlay {
          bottom: 246px;
        }

        .eka-widget-button {
          bottom: 180px !important;
        }
      }

      @media (max-width: 360px), (max-width: 767px) and (max-height: 720px) {
        .eka-widget-button {
          bottom: 90px !important;
        }
      }

      @media (max-width: 768px) {
        .eka-widget-button {
          right: 16px;
        }

        .eka-widget-button.stage-1 {
          width: 50px;
          height: 50px;
        }

        .eka-widget-button.stage-2 {
          width: auto;
          height: 44px;
          border-radius: 22px;
          bottom: 12px;
          right: 12px;
          padding: 6px 6px 6px 14px;
        }

        .eka-stage-2-content {
          gap: 8px;
          padding: 4px 16px 4px 4px;
        }

        .eka-stage-2-icon {
          width: 30px;
          height: 30px;
        }

        .eka-stage-2-title {
          font-size: 12px;
        }

        .eka-stage-2-subtitle {
          font-size: 10px;
        }

        .eka-widget-icon-button {
          display: none;
          // bottom: 16px;
          // right: 16px;
          // width: 56px;
          // height: 56px;
        }
      }

      /* Animation keyframes */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .eka-widget-icon-button {
        animation: fadeIn 0.3s ease;
      }

      @keyframes stage2FadeIn {
        from {
          opacity: 0;
          transform: scale(0.8) translateX(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateX(0);
        }
      }

      @keyframes stage1FadeOut {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.9);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Load Apollo icon (uses apollo_icon.gif)
  function loadApolloIcon(container, size) {
    var img = document.createElement("img");
    img.src = assetBase + "assets/apollo_icon.gif";
    img.alt = "Apollo Assist";
    img.setAttribute("width", size);
    img.setAttribute("height", size);
    img.style.width = size + "px";
    img.style.height = size + "px";
    img.style.objectFit = "contain";
    img.style.display = "block";
    container.innerHTML = "";
    container.appendChild(img);
  }

  //> update the button appearance based on the stage
  function updateButtonAppearance() {
    var button = window.EkaMedAssist._button;
    if (!button) return;

    var isMobile = window.innerWidth <= 768;

    // Clear existing content
    button.className = "eka-widget-button";
    button.innerHTML = "";

    if (widgetState.stage === 1) {
      // Stage 1: Icon only
      button.className = "eka-widget-button stage-1";
      // button.setAttribute("data-action", "open");

      var iconContainer = document.createElement("div");
      iconContainer.className = "eka-icon-container";
      loadApolloIcon(iconContainer, isMobile ? 32 : 40);
      button.appendChild(iconContainer);
    } else if (widgetState.stage === 2) {
      // Stage 2: Oval with text
      button.className = "eka-widget-button stage-2";
      var nudgeTitle = widgetState.nudgeText || "Hi, Need some help?";
      button.innerHTML = `
        <div class="eka-stage-2-content" data-action="open">
         <button class="eka-chat-close" data-action="close">×</button>
          <div class="eka-stage-2-text">
            <p class="eka-stage-2-title">${nudgeTitle}</p>
          </div>
          <div class="eka-stage-2-icon"></div>
        </div>
      `;
      var iconEl = button.querySelector(".eka-stage-2-icon");
      if (iconEl) {
        loadApolloIcon(iconEl, isMobile ? 22 : 36);
      }
    }
  }

  // Handle inactivity
  function resetInactivityTimer() {
    clearTimeout(widgetState.inactivityTimer);
    clearTimeout(widgetState.stage2Timer);

    // Read cookie to check if widget should stay closed
    const preference = getCookie("medassist-preferences");
    const shouldStayClosed = preference === "close";

    // Update widgetState based on cookie
    if (shouldStayClosed) {
      widgetState.isClosed = true;
    }

    if (widgetState.isClosed) {
      return;
    }

    // Don't schedule stage-2 until nudge API has resolved (or failed)
    if (!widgetState.nudgeReady) {
      return;
    }

    // After nudgeDelay (or 5s default) of inactivity, go to stage 2
    var inactivityDelay =
      widgetState.nudgeDelay > 0 ? widgetState.nudgeDelay * 1000 : 5000;
    widgetState.inactivityTimer = setTimeout(function () {
      if (
        !widgetState.isVisible &&
        widgetState.stage === 1 &&
        !widgetState.isClosed
        // window.innerWidth > 768
      ) {
        setStage(2);

        // After 3 more seconds, go to stage 3
        // widgetState.stage2Timer = setTimeout(function () {
        //   if (
        //     !widgetState.isVisible &&
        //     widgetState.stage === 2 &&
        //     !widgetState.isClosed
        //   ) {
        //     setStage(3);
        //   }
        // }, 10000);
      }
    }, inactivityDelay);
  }

  // Set widget stage
  function setStage(stage) {
    clearTimeout(widgetState.inactivityTimer);
    clearTimeout(widgetState.stage2Timer);

    widgetState.stage = stage;
    updateButtonAppearance();

    if (stage === 1) {
      resetInactivityTimer();
    }
  }

  // Create widget button
  function createWidgetButton(config) {
    var button = document.createElement("button");
    button.className = "eka-widget-button stage-1";

    var iconContainer = document.createElement("div");
    iconContainer.className = "eka-icon-container";
    loadApolloIcon(iconContainer, 40);
    button.appendChild(iconContainer);

    // Event delegation for all button interactions
    button.addEventListener("click", function (e) {
      var target = e.target.closest("[data-action]");
      if (target) {
        var action = target.getAttribute("data-action");
        e.stopPropagation();
        if (action === "close") {
          setStage(1);
          widgetState.isClosed = true;
          setCookie("medassist-preferences", "close");
        } else if (action === "open") {
          toggleWidget(config);
        }
      } else {
        // Main button click
        toggleWidget(config);
      }
    });

    button.addEventListener("mouseenter", function () {
      if (widgetState.stage === 1) {
        resetInactivityTimer();
      }
    });

    // Responsive updates
    window.addEventListener("resize", updateButtonAppearance);

    // Start inactivity timer
    resetInactivityTimer();

    return button;
  }

  // Load React app bundle
  function loadReactApp(config, callback) {
    if (widgetState.isLoaded) {
      callback();
      return;
    }

    if (config.cssUrl) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = config.cssUrl;
      document.head.appendChild(link);
    }

    var script = document.createElement("script");
    script.src = config.scriptUrl;
    script.onload = function () {
      widgetState.isLoaded = true;
      callback();
    };
    script.onerror = function () {
      console.error("Failed to load bundle");
    };
    document.head.appendChild(script);
  }

  function getMode() {
    // Find the script tag that loaded this file
    let scriptSrc = getCurrentScript()?.src || null;
    let mode = null;

    // Extract mode from query string
    if (scriptSrc) {
      const url = new URL(scriptSrc, window.location.href);
      mode = url.searchParams.get("mode");
    }
    // Use mode from query string if available, otherwise use config.mode
    return mode || defaultConfig.mode;
  }
  // Mount the React widget
  function mountWidget(config) {
    if (!window.EkaMedAssistWidget || !window.EkaMedAssistWidget.init) {
      console.error("EkaMedAssistWidget not available");
      return;
    }

    widgetState.instance = window.EkaMedAssistWidget.init({
      theme: config.theme,
      primaryColor: config.primaryColor,
      onMinimize: function () {
        hideWidget();
        showButton();
      },
      onClose: function () {
        hideWidget();
        showButton();
      },
      mode: config.mode,
      firstUserMessage: widgetState?.firstUserMessage || "",
    });

    widgetState.isVisible = true;
    widgetState.firstUserMessage = null;
    window._first_user_message = null;
    hideButton();
  }

  // Toggle widget visibility --> show and hide the widget
  function toggleWidget(config) {
    if (!widgetState.isLoaded) {
      //clear all timeouts
      clearTimeout(widgetState.inactivityTimer);
      clearTimeout(widgetState.stage2Timer);
      loadReactApp(config, function () {
        mountWidget(config);
      });
    } else if (widgetState.isVisible) {
      hideWidget();
    } else {
      showWidget(config);
    }
  }

  // Show widget --> show the widget
  function showWidget(config) {
    // Set cookie to "open" when opening widget
    setCookie("medassist-preferences", "open");
    widgetState.isClosed = false;

    if (!widgetState.isLoaded) {
      loadReactApp(config, function () {
        mountWidget(config);
      });
    } else if (!widgetState.isVisible) {
      if (!widgetState.instance) {
        mountWidget(config);
      } else if (widgetState.instance.container) {
        widgetState.instance.container.style.display = "block";
      }
      widgetState.isVisible = true;
      hideButton();
    }
  }

  // Hide widget --> hide the widget
  function hideWidget() {
    if (widgetState.instance && widgetState.isVisible) {
      if (widgetState.instance.destroy) {
        widgetState.instance.destroy();
        widgetState.instance = null;
      }
      widgetState.isClosed = true;
      widgetState.isVisible = false;
      setCookie("medassist-preferences", "close");
      showButton();
      resetInactivityTimer();
    }
  }

  // Show/hide button
  function showButton() {
    if (window.EkaMedAssist._button) {
      window.EkaMedAssist._button.style.display = "flex";
      setStage(1);
    }
  }

  function hideButton() {
    if (window.EkaMedAssist._button) {
      window.EkaMedAssist._button.style.display = "none";
    }
  }

  // Initialize widget
  function initWidget(config) {
    if (window.EkaMedAssist && window.EkaMedAssist._initialized) {
      return;
    }

    config = Object.assign({}, defaultConfig, config);
    createIsolatedCSS();
    // Initialize from cookie
    initializeFromCookie();

    var mode = getMode();
    if (mode === "full") {
      toggleWidget({ ...config, mode: "full" });
      if (window.EkaMedAssist) {
        window.EkaMedAssist._initialized = true;
      }
    } else {
      var button = createWidgetButton(config);
      document.body.appendChild(button);
      if (window.EkaMedAssist) {
        window.EkaMedAssist._initialized = true;
        window.EkaMedAssist._button = button;
      }

      // Fetch nudge in background; store text+delay for when stage-2 fires
      resolveNudge(config.agentId || defaultConfig.agentId || "")
        .then(function (result) {
          widgetState.nudgeText = result.text;
          widgetState.nudgeDelay = result.delay || 0;
        })
        .catch(function () {
          // API failed — use fallback text, nudgeDelay stays 0 (5s default will apply)
          widgetState.nudgeText = null;
        })
        .finally(function () {
          // Now it's safe to start the inactivity timer
          widgetState.nudgeReady = true;
          resetInactivityTimer();
        });
    }
  }

  // Initialize widget state from cookie
  function initializeFromCookie() {
    const preference = getCookie("medassist-preferences");
    if (preference === null) {
      // Cookie doesn't exist, set default to "open"
      setCookie("medassist-preferences", "open");
      widgetState.isClosed = false;
    } else if (preference === "close") {
      widgetState.isClosed = true;
    } else {
      widgetState.isClosed = false;
    }
  }
  // Global API
  window.EkaMedAssist = {
    init: function (config) {
      initWidget(config);
    },
    show: showWidget,
    hide: hideWidget,
    toggle: toggleWidget,
    setStage: setStage,
    config: defaultConfig,
    _initialized: false,
    _button: null,
  };

  // Auto-initialize
  function autoInit() {
    if (!window.EkaMedAssist._initialized) {
      initWidget(defaultConfig);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();
