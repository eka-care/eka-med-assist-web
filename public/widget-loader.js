(function () {
  "use strict";

  // Widget configuration
  var defaultConfig = {
    theme: "doctor-light",
    position: "bottom-right",
    widgetUrl: "https://your-cdn-domain.com/widget.html", // This will be your CDN URL
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
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: white;
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        padding: 0;
        overflow: hidden;
      }
      
      .eka-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
      }
      
      .eka-widget-button:active {
        transform: scale(0.98);
      }
      
      .eka-widget-button svg {
        width: 28px;
        height: 28px;
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
        
        .eka-widget-button svg {
          width: 24px;
          height: 24px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create widget button
  function createWidgetButton(config) {
    var button = document.createElement("button");
    button.className = "eka-widget-button";

    // Create the SVG icon
    var svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgIcon.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgIcon.setAttribute("width", "28");
    svgIcon.setAttribute("height", "28");
    svgIcon.setAttribute("viewBox", "0 0 28 28");
    svgIcon.setAttribute("fill", "none");

    // Blue circle
    var blueCircle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    blueCircle.setAttribute("cx", "16");
    blueCircle.setAttribute("cy", "16");
    blueCircle.setAttribute("r", "12");
    blueCircle.setAttribute("fill", "#215FFF");

    // Foreign object for backdrop filter
    var foreignObject = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "foreignObject"
    );
    foreignObject.setAttribute("x", "-2.53846");
    foreignObject.setAttribute("y", "-2.53846");
    foreignObject.setAttribute("width", "21.0769");
    foreignObject.setAttribute("height", "21.0769");

    var div = document.createElement("div");
    div.style.cssText =
      "backdrop-filter:blur(1.27px);clip-path:url(#bgblur_0_550_2_clip_path);height:100%;width:100%";

    foreignObject.appendChild(div);

    // Purple circle
    var purpleCircle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    purpleCircle.setAttribute("data-figma-bg-blur-radius", "2.53846");
    purpleCircle.setAttribute("cx", "8");
    purpleCircle.setAttribute("cy", "8");
    purpleCircle.setAttribute("r", "8");
    purpleCircle.setAttribute("fill", "#B45EDC");
    purpleCircle.setAttribute("fill-opacity", "0.6");

    // Definitions
    var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    var clipPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "clipPath"
    );
    clipPath.setAttribute("id", "bgblur_0_550_2_clip_path");
    clipPath.setAttribute("transform", "translate(2.53846 2.53846)");

    var clipCircle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    clipCircle.setAttribute("cx", "8");
    clipCircle.setAttribute("cy", "8");
    clipCircle.setAttribute("r", "8");

    clipPath.appendChild(clipCircle);
    defs.appendChild(clipPath);

    // Assemble SVG
    svgIcon.appendChild(blueCircle);
    svgIcon.appendChild(foreignObject);
    svgIcon.appendChild(purpleCircle);
    svgIcon.appendChild(defs);

    button.appendChild(svgIcon);
    button.title = "Eka Medical Assistant";

    button.addEventListener("click", function () {
      toggleWidget(config);
    });

    return button;
  }


  // Toggle widget visibility
  function toggleWidget(config) {
    // TODO: Implement direct React app mounting
    console.log("Toggle widget clicked", config);
  }

  // Show widget
  function showWidget(config) {
    // TODO: Implement direct React app mounting
    console.log("Show widget", config);
  }

  // Hide widget
  function hideWidget() {
    // TODO: Implement direct React app unmounting
    console.log("Hide widget");
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
    init: function(config) {
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
