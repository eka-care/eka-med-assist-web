(function () {
  "use strict";

  // Widget configuration
  var defaultConfig = {
    theme: "doctor-light",
    position: "bottom-right",
    scriptUrl: "https://cdn.ekacare.co/apollo/widget.js",
    cssUrl: "https://cdn.ekacare.co/apollo/assets/widget.css",
  };

  // Widget state
  var widgetState = {
    isLoaded: false,
    isVisible: false,
    instance: null,
    config: null,
  };

  // Create isolated CSS with best practices
  function createIsolatedCSS() {
    var style = document.createElement("style");
    style.id = "eka-widget-styles";
    style.textContent = `
      /* Reset and base styles */
      .eka-widget-button {
        all: initial;
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #ffffff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        z-index: 2147483647;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        padding: 0;
      }

      .eka-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .eka-widget-button:active {
        transform: scale(0.95);
      }

      .eka-widget-button.hidden {
        display: none;
      }

      .eka-icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative;
      }

      .eka-icon-container svg {
        display: block;
        margin: 0 auto;
      }

      /* Mobile responsive styles */
      @media (max-width: 768px) {
        .eka-widget-button {
          bottom: 16px;
          right: 16px;
          width: 50px;
          height: 50px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Load DocAssist icon SVG
  function loadDocAssistIcon(container, size) {
    var iconSize = size || 24;
    // Generate unique ID for clipPath to avoid conflicts
    var clipPathId = "bgblur_eka_" + Math.random().toString(36).substr(2, 9);
    // Center the icon by adjusting viewBox - content spans roughly 0-16, center is at 8
    // Adjust viewBox to center the content: shift by 4 units (12-8=4) to center at 12
    container.innerHTML = `
      <svg
        width="${iconSize}"
        height="${iconSize}"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="display: block; margin: 0 auto;"
      >
        <g transform="translate(4, 4)">
          <circle cx="9.5" cy="9.5" r="6.5" fill="#215FFF" />
          <foreignObject x="-2.53846" y="-2.53846" width="14.0769" height="14.0769">
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style="
                backdrop-filter: blur(1.27px);
                clip-path: url(#${clipPathId});
                height: 100%;
                width: 100%;
              "
            ></div>
          </foreignObject>
          <circle
            data-figma-bg-blur-radius="2.53846"
            cx="4.5"
            cy="4.5"
            r="4.5"
            fill="#B45EDC"
            fill-opacity="0.6"
          />
        </g>
        <defs>
          <clipPath id="${clipPathId}" transform="translate(2.53846 2.53846)">
            <circle cx="4.5" cy="4.5" r="4.5" />
          </clipPath>
        </defs>
      </svg>
    `;
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
      console.log("Eka Medical Assistant bundle loaded");
      widgetState.isLoaded = true;
      callback();
    };
    script.onerror = function () {
      console.error("Failed to load bundle");
    };
    document.head.appendChild(script);
  }

  // Mount the React widget
  function mountWidget(config) {
    if (!window.EkaMedAssistWidget || !window.EkaMedAssistWidget.init) {
      console.error("EkaMedAssistWidget not available");
      return;
    }

    widgetState.config = config;
    widgetState.instance = window.EkaMedAssistWidget.init({
      agentId: config.agentId,
      theme: config.theme || defaultConfig.theme,
      onClose: function () {
        hideWidget();
        showButton();
      },
      widgetTitle: config.widgetTitle,
      firstBotMessage: config.firstBotMessage,
      firstUserMessage: config.firstUserMessage,
    });

    widgetState.isVisible = true;
    hideButton();
  }

  // Toggle widget visibility
  function toggleWidget(config) {
    // Use stored config if no config provided
    if (!config && window.EkaMedAssist && window.EkaMedAssist._config) {
      config = window.EkaMedAssist._config;
    }

    if (!config) {
      console.error("No config available for widget");
      return;
    }

    if (!widgetState.isLoaded) {
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
    // Use stored config if no config provided
    if (!config && window.EkaMedAssist && window.EkaMedAssist._config) {
      config = window.EkaMedAssist._config;
    }

    if (!config) {
      console.error("No config available for widget");
      return;
    }

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

  // Hide widget
  function hideWidget() {
    if (widgetState.instance && widgetState.isVisible) {
      if (widgetState.instance.destroy) {
        widgetState.instance.destroy();
        widgetState.instance = null;
      }
      widgetState.isVisible = false;
      showButton();
    }
  }

  // Show/hide button
  function showButton() {
    if (window.EkaMedAssist._button) {
      window.EkaMedAssist._button.classList.remove("hidden");
    }
  }

  function hideButton() {
    if (window.EkaMedAssist._button) {
      window.EkaMedAssist._button.classList.add("hidden");
    }
  }

  // Create widget button
  function createWidgetButton(config) {
    var button = document.createElement("button");
    button.className = "eka-widget-button";

    var iconContainer = document.createElement("div");
    iconContainer.className = "eka-icon-container";
    var isMobile = window.innerWidth <= 768;
    loadDocAssistIcon(iconContainer, isMobile ? 30 : 30);
    button.appendChild(iconContainer);

    // Handle button click
    button.addEventListener("click", function (e) {
      e.stopPropagation();
      // Use stored config if available, otherwise use the passed config
      var buttonConfig =
        (window.EkaMedAssist && window.EkaMedAssist._config) || config;
      toggleWidget(buttonConfig);
    });

    // Responsive updates
    window.addEventListener("resize", function () {
      var iconContainer = button.querySelector(".eka-icon-container");
      if (iconContainer) {
        var isMobile = window.innerWidth <= 768;
        loadDocAssistIcon(iconContainer, isMobile ? 30 : 30);
      }
    });

    return button;
  }

  // Initialize widget
  function initWidget(config) {
    if (window.EkaMedAssist && window.EkaMedAssist._initialized) {
      console.warn("Widget already initialized");
      return;
    }

    // Validate required agentId parameter
    if (
      !config ||
      !config.agentId ||
      typeof config.agentId !== "string" ||
      config.agentId.trim() === ""
    ) {
      const error = new Error(
        "agentId is required and must be a non-empty string"
      );
      console.error("EkaMedAssist initialization error:", error.message);
      throw error;
    }

    config = Object.assign({}, defaultConfig, config);
    createIsolatedCSS();

    var button = createWidgetButton(config);
    document.body.appendChild(button);

    if (window.EkaMedAssist) {
      window.EkaMedAssist._initialized = true;
      window.EkaMedAssist._button = button;
      window.EkaMedAssist._config = config;
    }

    console.log("Widget initialized");
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
    _config: null,
  };

  // Auto-initialize
  function autoInit() {
    if (!window.EkaMedAssist._initialized) {
      // Don't auto-initialize without config
      // Widget must be initialized with config via window.EkaMedAssist.init()
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();
