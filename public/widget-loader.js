(function () {
  "use strict";

  // Widget configuration
  var defaultConfig = {
    theme: "doctor-light",
    position: "bottom-right",
    scriptUrl: "https://cdn.ekacare.co/apollo/widget.js",
    cssUrl: "https://cdn.ekacare.co/apollo/assets/widget.css",
  };

  // Create isolated CSS
  function createIsolatedCSS() {
    var style = document.createElement("style");
    style.id = "eka-widget-styles";
    style.textContent = `
      .eka-widget-container {
        position: fixed;
        z-index: 2147483647;
        font-family: system-ui, sans-serif;
        box-sizing: border-box;
        pointer-events: auto;
      }
      
      .eka-widget-container * {
        box-sizing: border-box;
      }
      
      .eka-widget-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: white;
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        padding: 0;
        overflow: hidden;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      
      .eka-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
      }
      
      .eka-widget-button:active {
        transform: scale(0.98);
      }
      
      .eka-widget-button > div {
        width: 40px;
        height: 40px;
        display: block;
      }
      

      /* Mobile responsive */
      @media (max-width: 768px) {
        .eka-widget-button {
          bottom: 15px;
          right: 15px;
          width: 50px;
          height: 50px;
        }
        
        .eka-widget-button > div {
          width: 32px;
          height: 32px;
        }
        
        /* Mobile oval button styles */
        .eka-widget-button.inactive {
          width: 260px !important;
          height: 55px !important;
          border-radius: 27.5px !important;
          padding: 0 15px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Load Apollo icon inline for better performance
  function loadApolloIcon(container, size) {
    // Calculate scaled dimensions based on size
    var scale = size / 200; // Original animation is 200px
    var blueSize = 80 * scale;
    var yellowSize = 60 * scale;
    var blueLeft = 60 * scale;
    var blueTop = 90 * scale;
    var yellowLeft = 40 * scale;
    var yellowTop = 50 * scale;

    // Add CSS animations if not already present
    if (!document.getElementById("apollo-icon-styles")) {
      var styleElement = document.createElement("style");
      styleElement.id = "apollo-icon-styles";
      styleElement.textContent =
        "@keyframes spinBlue {" +
        "0% { transform: rotate(0deg); }" +
        "22% { transform: rotate(147deg); }" +
        "38% { transform: rotate(311deg); }" +
        "61% { transform: rotate(73deg); }" +
        "79% { transform: rotate(222deg); }" +
        "100% { transform: rotate(360deg); }" +
        "}" +
        "@keyframes spinYellow {" +
        "0% { transform: rotate(0deg); }" +
        "18% { transform: rotate(260deg); }" +
        "36% { transform: rotate(105deg); }" +
        "59% { transform: rotate(330deg); }" +
        "83% { transform: rotate(185deg); }" +
        "100% { transform: rotate(540deg); }" +
        "}" +
        "@keyframes fadeA {" +
        "0%, 35% { opacity: 1; }" +
        "45%, 65% { opacity: 0; }" +
        "100% { opacity: 1; }" +
        "}" +
        "@keyframes fadeB {" +
        "0%, 35% { opacity: 0; }" +
        "45%, 65% { opacity: 1; }" +
        "100% { opacity: 0; }" +
        "}" +
        ".apollo-circle.blue .pulse {" +
        "animation: pulseBlue 16s ease-in-out infinite;" +
        "}" +
        ".apollo-circle.yellow .pulse {" +
        "animation: pulseYellow 16s ease-in-out infinite 0.8s;" +
        "}" +
        "@keyframes pulseBlue {" +
        "0%, 35% { transform: scale(1); }" +
        "45% { transform: scale(1.02); }" +
        "55% { transform: scale(0.98); }" +
        "70%, 100% { transform: scale(1); }" +
        "}" +
        "@keyframes pulseYellow {" +
        "0%, 20% { transform: scale(1); }" +
        "35% { transform: scale(1.06); }" +
        "55% { transform: scale(0.97); }" +
        "70%, 100% { transform: scale(1); }" +
        "}";
      document.head.appendChild(styleElement);
    }

    // Create the icon HTML directly
    container.innerHTML =
      "<div class='apollo-icon-container' style='" +
      "width: " +
      size +
      "px;" +
      "height: " +
      size +
      "px;" +
      "position: relative;" +
      "display: flex;" +
      "align-items: center;" +
      "justify-content: center;" +
      "overflow: hidden;" +
      "border-radius: 50%;" +
      "background: #fff;" +
      "'>" +
      "<div class='apollo-circle blue' style='" +
      "position: absolute;" +
      "border-radius: 50%;" +
      "overflow: hidden;" +
      "width: " +
      blueSize +
      "px;" +
      "height: " +
      blueSize +
      "px;" +
      "left: " +
      blueLeft +
      "px;" +
      "top: " +
      blueTop +
      "px;" +
      "'>" +
      "<div class='pulse' style='" +
      "position: absolute;" +
      "inset: 0;" +
      "border-radius: 50%;" +
      "will-change: transform;" +
      "'>" +
      "<div class='layer a' style='" +
      "position: absolute;" +
      "inset: 0;" +
      "border-radius: 50%;" +
      "background-size: 200% 200%;" +
      "will-change: opacity, transform, background-position;" +
      "background-image: linear-gradient(0deg, #2582a1, #fdb931);" +
      "animation: spinBlue 16s linear infinite, fadeA 16s ease-in-out infinite;" +
      "'></div>" +
      "<div class='layer b' style='" +
      "position: absolute;" +
      "inset: 0;" +
      "border-radius: 50%;" +
      "background-size: 200% 200%;" +
      "will-change: opacity, transform, background-position;" +
      "background-image: linear-gradient(0deg, #fdb931, #2582a1);" +
      "animation: spinBlue 16s linear infinite, fadeB 16s ease-in-out infinite;" +
      "'></div>" +
      "</div>" +
      "</div>" +
      "<div class='apollo-circle yellow' style='" +
      "position: absolute;" +
      "border-radius: 50%;" +
      "overflow: hidden;" +
      "width: " +
      yellowSize +
      "px;" +
      "height: " +
      yellowSize +
      "px;" +
      "left: " +
      yellowLeft +
      "px;" +
      "top: " +
      yellowTop +
      "px;" +
      "'>" +
      "<div class='pulse' style='" +
      "position: absolute;" +
      "inset: 0;" +
      "border-radius: 50%;" +
      "will-change: transform;" +
      "'>" +
      "<div class='layer a' style='" +
      "position: absolute;" +
      "inset: 0;" +
      "border-radius: 50%;" +
      "background-size: 200% 200%;" +
      "will-change: opacity, transform, background-position;" +
      "background-image: linear-gradient(0deg, #fdb931, #2582a1);" +
      "animation: spinYellow 17s linear infinite 0.8s, fadeB 16s ease-in-out infinite 0.8s;" +
      "'></div>" +
      "<div class='layer b' style='" +
      "position: absolute;" +
      "inset: 0;" +
      "border-radius: 50%;" +
      "background-size: 200% 200%;" +
      "will-change: opacity, transform, background-position;" +
      "background-image: linear-gradient(0deg, #2582a1, #fdb931);" +
      "animation: spinYellow 17s linear infinite 0.8s, fadeA 16s ease-in-out infinite 0.8s;" +
      "'></div>" +
      "</div>" +
      "</div>" +
      "</div>";
  }

  // Inactivity detection
  function resetInactivityTimer() {
    widgetState.lastActivityTime = Date.now();
    if (widgetState.inactivityTimer) {
      clearTimeout(widgetState.inactivityTimer);
    }

    // Set timer for 5 seconds of inactivity
    widgetState.inactivityTimer = setTimeout(function () {
      if (!widgetState.isVisible) {
        widgetState.isInactive = true;
        updateButtonAppearance();
      }
    }, 5000);
  }

  // Update button appearance based on state
  function updateButtonAppearance() {
    var button = window.EkaMedAssist._button;
    if (!button) return;

    // Check if mobile
    var isMobile = window.innerWidth <= 768;

    if (widgetState.isInactive && !widgetState.isVisible) {
      // Show oval with text and icon
      button.className = "eka-widget-button inactive";
      button.style.width = isMobile ? "260px" : "280px";
      button.style.height = isMobile ? "55px" : "60px";
      button.style.borderRadius = isMobile ? "27.5px" : "30px";
      button.style.padding = isMobile ? "0 15px" : "8px 8px 8px 24px";
      button.style.justifyContent = "space-between";
      button.style.background = "#fdb931";
      button.style.color = "#000";
      button.style.fontSize = isMobile ? "13px" : "16px";
      button.style.fontWeight = "500";

      // Update content
      button.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: flex-start; flex: 1;">
          <div style="font-weight: 600; line-height: 1.2;">Hi, Need some help?</div>
          <div style="font-weight: normal; font-size: ${
            isMobile ? "11px" : "12px"
          }; line-height: 1.2;">I'm happy to assist.</div>
        </div>
        <div style="width: ${isMobile ? "35px" : "40px"}; height: ${
        isMobile ? "35px" : "40px"
      }; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 50%; margin-left: 10px;">
          <div style="width: ${isMobile ? "28px" : "32px"}; height: ${
        isMobile ? "28px" : "32px"
      }; position: relative;"></div>
        </div>
      `;

      // Load icon in the new container
      var iconContainer = button.querySelector("div:last-child div");
      if (iconContainer) {
        loadApolloIcon(iconContainer, isMobile ? 28 : 36);
      }
    } else {
      // Show circular icon only
      button.className = "eka-widget-button";
      button.style.width = isMobile ? "50px" : "56px";
      button.style.height = isMobile ? "50px" : "56px";
      button.style.borderRadius = "50%";
      button.style.padding = "0";
      button.style.justifyContent = "center";
      button.style.background = "white";
      button.style.color = "white";
      button.style.fontSize = "inherit";
      button.style.fontWeight = "inherit";

      // Reset content to icon only
      button.innerHTML = `
        <div style="width: ${isMobile ? "32px" : "40px"}; height: ${
        isMobile ? "32px" : "40px"
      }; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; background: #fff;"></div>
      `;

      // Load icon in the container
      var iconContainer = button.querySelector("div");
      if (iconContainer) {
        loadApolloIcon(iconContainer, isMobile ? 32 : 40);
      }
    }
  }

  // Create widget button
  function createWidgetButton(config) {
    var button = document.createElement("button");
    button.className = "eka-widget-button";

    // Create Apollo Assist icon container
    var iconContainer = document.createElement("div");
    iconContainer.style.cssText =
      "width: 40px;" +
      "height: 40px;" +
      "position: relative;" +
      "display: flex;" +
      "align-items: center;" +
      "justify-content: center;" +
      "overflow: hidden;" +
      "border-radius: 50%;" +
      "background: #fff;";

    // Load Apollo icon from CDN
    loadApolloIcon(iconContainer, 40);

    button.appendChild(iconContainer);
    button.title = "Apollo Medical Assistant";

    button.addEventListener("click", function () {
      widgetState.config = config;
      widgetState.isInactive = false;
      resetInactivityTimer();
      toggleWidget(config);
    });

    // Add hover event to reset inactivity
    button.addEventListener("mouseenter", function () {
      if (widgetState.isInactive) {
        widgetState.isInactive = false;
        updateButtonAppearance();
      }
      resetInactivityTimer();
    });

    // Add window resize listener for responsive updates
    window.addEventListener("resize", function () {
      if (widgetState.isInactive) {
        updateButtonAppearance();
      }
    });

    // Start inactivity timer
    resetInactivityTimer();

    return button;
  }

  // Widget state
  var widgetState = {
    isLoaded: false,
    isVisible: false,
    instance: null,
    config: null,
    isInactive: false,
    inactivityTimer: null,
    lastActivityTime: Date.now(),
  };

  // Load React app bundle
  function loadReactApp(config, callback) {
    if (widgetState.isLoaded) {
      callback();
      return;
    }

    // Load CSS first
    if (config.cssUrl) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = config.cssUrl;
      document.head.appendChild(link);
    }
    // Load the JavaScript bundle
    var script = document.createElement("script");
    script.src = config.scriptUrl;
    script.onload = function () {
      console.log("Eka Medical Assistant bundle loaded successfully");
      widgetState.isLoaded = true;
      callback();
    };
    script.onerror = function () {
      console.error(
        "Failed to load Eka Medical Assistant bundle from:",
        config.scriptUrl
      );
    };
    document.head.appendChild(script);
  }

  // Mount the React widget
  function mountWidget(config) {
    // Check if the widget API is available
    if (!window.EkaMedAssistWidget || !window.EkaMedAssistWidget.init) {
      console.error(
        "EkaMedAssistWidget not available. Make sure the bundle is loaded."
      );
      return;
    }

    // Initialize the widget (internally mounts a Web Component with Shadow DOM)
    widgetState.instance = window.EkaMedAssistWidget.init({
      theme: config.theme,
      onMinimize: function () {
        hideWidget();
        showButton();
      },
      onClose: function () {
        hideWidget();
        showButton();
      },
    });

    widgetState.isVisible = true;
    hideButton();
  }

  // Toggle widget visibility
  function toggleWidget(config) {
    if (!widgetState.isLoaded) {
      // First time - load the React app
      loadReactApp(config, function () {
        mountWidget(config);
      });
    } else if (widgetState.isVisible) {
      hideWidget();
    } else {
      showWidget(config);
    }
  }

  // Show widget
  function showWidget(config) {
    if (!widgetState.isLoaded) {
      loadReactApp(config, function () {
        mountWidget(config);
      });
    } else if (!widgetState.isVisible) {
      if (!widgetState.instance) {
        mountWidget(config);
      } else {
        // Re-show existing instance: ensure the custom element is attached
        if (widgetState.instance.container) {
          widgetState.instance.container.style.display = "block";
        }
      }
      widgetState.isVisible = true;
      widgetState.isInactive = false;
      hideButton();
    }
  }

  // Hide widget
  function hideWidget() {
    if (widgetState.instance && widgetState.isVisible) {
      // Destroy the widget instance completely (removes the custom element)
      if (widgetState.instance.destroy) {
        widgetState.instance.destroy();
        widgetState.instance = null;
      }
      widgetState.isVisible = false;
      showButton();
      // Reset inactivity timer when widget is closed
      resetInactivityTimer();
    }
  }

  // Show button
  function showButton() {
    if (window.EkaMedAssist._button) {
      window.EkaMedAssist._button.style.display = "flex";
      // Reset button to normal state when showing
      widgetState.isInactive = false;
      updateButtonAppearance();
    }
  }

  // Hide button
  function hideButton() {
    if (window.EkaMedAssist._button) {
      window.EkaMedAssist._button.style.display = "none";
    }
  }

  // Initialize widget
  function initWidget(config) {
    // Prevent double initialization
    if (window.EkaMedAssist && window.EkaMedAssist._initialized) {
      console.warn("Eka Medical Assistant Widget already initialized");
      return;
    }

    config = Object.assign({}, defaultConfig, config);

    // Create isolated CSS
    createIsolatedCSS();

    // Create and append widget button
    var button = createWidgetButton(config);
    document.body.appendChild(button);

    // Mark as initialized
    if (window.EkaMedAssist) {
      window.EkaMedAssist._initialized = true;
      window.EkaMedAssist._button = button;
    }

    console.log(
      "Eka Medical Assistant Widget loader initialized with config:",
      config
    );
  }

  // Global API
  window.EkaMedAssist = {
    init: function (config) {
      initWidget(config);
    },
    show: showWidget,
    hide: hideWidget,
    toggle: toggleWidget,
    config: defaultConfig,
    _initialized: false,
    _button: null,
  };

  // Auto-initialize on DOM ready with default config
  function autoInit() {
    if (!window.EkaMedAssist._initialized) {
      initWidget(defaultConfig);
    }
  }

  // Check if DOM is ready
  if (document.readyState === "loading") {
    // DOM is still loading, wait for it
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    // DOM is already ready, initialize immediately
    autoInit();
  }
})();
