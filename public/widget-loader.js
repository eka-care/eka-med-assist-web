(function () {
  "use strict";

  // Widget configuration
  var defaultConfig = {
    theme: "doctor-light",
    position: "bottom-right",
  };

  // Create isolated CSS
  function createIsolatedCSS() {
    var style = document.createElement("style");
    style.id = "eka-widget-styles";
    style.textContent = `
      .eka-widget-container {
        position: fixed;
        z-index: 999999;
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
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #007bff;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      .eka-widget-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      
      .eka-widget-iframe {
        border: none;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        background: white;
        z-index: 999998;
        position: fixed;
        bottom: 100px;
        right: 20px;
        width: 400px;
        height: 600px;
        display: none;
      }
      
      .eka-widget-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999997;
        display: none;
      }
      
      .eka-widget-overlay.active {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  // Create widget button
  function createWidgetButton(config) {
    var button = document.createElement("button");
    button.className = "eka-widget-button";
    button.innerHTML = "��";
    button.title = "Eka Medical Assistant";

    button.addEventListener("click", function () {
      toggleWidget(config);
    });

    return button;
  }

  // Create widget iframe
  function createWidgetIframe(config) {
    var iframe = document.createElement("iframe");
    iframe.className = "eka-widget-iframe";
    iframe.src = config.widgetUrl || "./index.html";
    iframe.id = "eka-widget-iframe";

    return iframe;
  }

  // Create overlay
  function createOverlay() {
    var overlay = document.createElement("div");
    overlay.className = "eka-widget-overlay";
    overlay.id = "eka-widget-overlay";

    overlay.addEventListener("click", function () {
      hideWidget();
    });

    return overlay;
  }

  // Toggle widget visibility
  function toggleWidget(config) {
    var iframe = document.getElementById("eka-widget-iframe");
    var overlay = document.getElementById("eka-widget-overlay");

    if (iframe && iframe.style.display !== "none") {
      hideWidget();
    } else {
      showWidget(config);
    }
  }

  // Show widget
  function showWidget(config) {
    var iframe = document.getElementById("eka-widget-iframe");
    var overlay = document.getElementById("eka-widget-overlay");

    if (!iframe) {
      iframe = createWidgetIframe(config);
      document.body.appendChild(iframe);
    }

    if (!overlay) {
      overlay = createOverlay();
      document.body.appendChild(overlay);
    }

    iframe.style.display = "block";
    overlay.classList.add("active");
  }

  // Hide widget
  function hideWidget() {
    var iframe = document.getElementById("eka-widget-iframe");
    var overlay = document.getElementById("eka-widget-overlay");

    if (iframe) {
      iframe.style.display = "none";
    }

    if (overlay) {
      overlay.classList.remove("active");
    }
  }

  // Initialize widget
  function initWidget(config) {
    config = Object.assign({}, defaultConfig, config);

    // Create isolated CSS
    createIsolatedCSS();

    // Create and append widget button
    var button = createWidgetButton(config);
    document.body.appendChild(button);

    // Create overlay
    var overlay = createOverlay();
    document.body.appendChild(overlay);

    console.log("Eka Medical Assistant Widget loader initialized");
  }

  // Global API
  window.EkaMedAssist = {
    init: initWidget,
    show: showWidget,
    hide: hideWidget,
    toggle: toggleWidget,
  };
})();
