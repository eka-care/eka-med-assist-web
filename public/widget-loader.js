/**
 * @fileoverview EkaMedAssist Widget Loader
 *
 * This script loads and initializes the EkaMedAssist widget.
 * It provides a simple API for embedding the widget in any website.
 *
 * @example
 * // Basic usage
 * window.EkaMedAssist.init({
 *   widgetTitle: "Chat Support",
 *   firstBotMessage: "Hello! How can I help?",
 *   onClose: () => console.log("Widget closed")
 * });
 */

(function () {
  "use strict";

  /**
   * @typedef {Object} WidgetConfig
   * @property {string} [theme="doctor-light"] - Theme for the widget
   * @property {string} [position="bottom-right"] - Widget position
   * @property {string} [scriptUrl] - Custom script URL
   * @property {string} [cssUrl] - Custom CSS URL
   * @property {string} [widgetTitle] - Widget title
   * @property {string} [firstBotMessage] - First bot message
   * @property {string} [firstUserMessage] - First user message
   * @property {Function} [onClose] - Callback when widget closes
   */

  // Widget configuration defaults
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

  /**
   * Load React app bundle and CSS
   * @param {WidgetConfig} config - Configuration object
   * @param {Function} callback - Callback to execute after loading
   */
  function loadReactApp(config, callback) {
    if (widgetState.isLoaded) {
      if (callback) callback();
      return;
    }

    // Load CSS first
    if (config.cssUrl) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = config.cssUrl;
      document.head.appendChild(link);
    }

    // Load JavaScript bundle
    var script = document.createElement("script");
    script.src = config.scriptUrl;
    script.onload = function () {
      console.log("Eka Medical Assistant bundle loaded");
      widgetState.isLoaded = true;
      if (callback) callback();
    };
    script.onerror = function () {
      console.error(
        "Failed to load EkaMedAssist bundle from:",
        config.scriptUrl
      );
    };
    document.head.appendChild(script);
  }

  /**
   * Mount the React widget with the provided configuration
   * @param {WidgetConfig} config - Configuration object
   */
  function mountWidget(config) {
    if (!window.EkaMedAssistWidget || !window.EkaMedAssistWidget.init) {
      console.error(
        "EkaMedAssistWidget not available. Make sure widget.js is loaded."
      );
      return;
    }

    // Store config for later use (e.g., onClose callback)
    widgetState.config = config;

    // Initialize widget with config
    widgetState.instance = window.EkaMedAssistWidget.init({
      theme: config.theme || defaultConfig.theme,
      onClose: function () {
        // closeWidget will handle the callback and state cleanup
        closeWidget();
      },
      widgetTitle: config.widgetTitle,
      firstBotMessage: config.firstBotMessage,
      firstUserMessage: config.firstUserMessage,
    });

    widgetState.isVisible = true;
  }

  /**
   * Open the widget (loads if needed, mounts if not visible)
   * @param {WidgetConfig} config - Configuration object
   */
  function openWidget(config) {
    if (!widgetState.isLoaded) {
      // Load bundle first, then mount
      loadReactApp(config, function () {
        mountWidget(config);
      });
    } else if (!widgetState.isVisible) {
      // Bundle already loaded, just mount or show
      if (!widgetState.instance) {
        mountWidget(config);
      } else if (widgetState.instance.container) {
        widgetState.instance.container.style.display = "block";
        widgetState.isVisible = true;
      }
    }
  }

  /**
   * Close the widget and reset all state
   */
  function closeWidget() {
    // Destroy widget instance if it exists
    if (widgetState.instance) {
      if (widgetState.instance.destroy) {
        widgetState.instance.destroy();
      }
      widgetState.instance = null;
    }

    // Call onClose callback if provided
    if (widgetState.config && widgetState.config.onClose) {
      widgetState.config.onClose();
    }

    // Reset all state
    widgetState.isVisible = false;
    widgetState.config = null;

    // Clear initialization flag
    if (window.EkaMedAssist) {
      window.EkaMedAssist._initialized = false;
    }
  }

  /**
   * Initialize the widget with the provided configuration
   * @param {WidgetConfig} [config={}] - Configuration object
   */
  function initWidget(config) {
    // Prevent multiple initializations
    if (window.EkaMedAssist && window.EkaMedAssist._initialized) {
      console.warn(
        "EkaMedAssist widget already initialized. Use closeMedAssist() first if you want to reinitialize."
      );
      return;
    }

    // Merge with defaults
    config = Object.assign({}, defaultConfig, config || {});

    // Open widget (will load and mount if needed)
    openWidget(config);

    // Mark as initialized
    if (window.EkaMedAssist) {
      window.EkaMedAssist._initialized = true;
    }

    console.log("EkaMedAssist widget initialized");
  }

  // Global API
  window.EkaMedAssist = {
    /**
     * Initialize the widget
     * @param {WidgetConfig} [config] - Configuration options
     */
    init: function (config) {
      initWidget(config);
    },

    /**
     * Close the widget
     */
    close: closeWidget,

    /**
     * Internal flag to track initialization state
     * @type {boolean}
     */
    _initialized: false,
  };
})();
