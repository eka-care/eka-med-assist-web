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
  
    const scripts = document.querySelectorAll(`script[src*="widget-loader.js"]`);
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
  };

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
        bottom: 20px;
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
      }

      @media (max-width: 767px) {
        .eka-stage-3-overlay {
          bottom: 246px;
        }
      }

      @media (max-width: 768px) {
        .eka-widget-button {
          bottom: 16px;
          right: 16px;
        }

        .eka-widget-button.stage-1 {
          width: 50px;
          height: 50px;
        }

        .eka-widget-button.stage-2 {
          width: auto;
          height: 55px;
          border-radius: 27.5px;
          // padding: 2px 15px;
        }

        .eka-stage-2-icon {
          width: 35px;
          height: 35px;
        }

        .eka-stage-2-title {
          font-size: 13px;
        }

        .eka-stage-2-subtitle {
          font-size: 11px;
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
      button.innerHTML = `
        <div class="eka-stage-2-content" data-action="open">
         <button class="eka-chat-close" data-action="close">×</button>
          <div class="eka-stage-2-text">
            <p class="eka-stage-2-title">Hi, Need some help?</p>
            <p class="eka-stage-2-subtitle">I'm happy to assist.</p>
          </div>
          <div class="eka-stage-2-icon"></div>
        </div>
      `;
      var iconEl = button.querySelector(".eka-stage-2-icon");
      if (iconEl) {
        loadApolloIcon(iconEl, isMobile ? 28 : 36);
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

    // After 3 seconds of inactivity, go to stage 2
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
    }, 5000);
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
