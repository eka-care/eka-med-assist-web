(function () {
  "use strict";

  // Widget configuration
  var defaultConfig = {
    theme: "doctor-light",
    position: "bottom-right",
    widgetName: "Med Assist",
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

      /* Mobile responsive */
      @media (max-width: 768px) {
        .eka-widget-iframe {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
        }
        
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

  // Create widget iframe
  function createWidgetIframe(config) {
    var iframe = document.createElement("iframe");
    iframe.className = "eka-widget-iframe";
    iframe.src = config.widgetUrl;
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
    var button = document.querySelector(".eka-widget-button");

    if (iframe && iframe.style.display !== "none") {
      hideWidget();
    } else {
      showWidget(config);
    }
  }

  // Enhanced showWidget function
  function showWidget(config) {
    var iframe = document.getElementById("eka-widget-iframe");
    var button = document.querySelector(".eka-widget-button");

    if (!iframe) {
      iframe = createWidgetIframe(config);
      document.body.appendChild(iframe);

      // Add load event listener only once when iframe is created
      iframe.addEventListener("load", function () {
        // Wait for iframe to load, then send initialization message
        setTimeout(() => {
          iframe.contentWindow.postMessage(
            {
              type: "WIDGET_INITIALIZE",
              config: config,
            },
            "*"
          );
        }, 100);
      });
    } else {
      // Iframe already exists, send initialization message immediately
      setTimeout(() => {
        iframe.contentWindow.postMessage(
          {
            type: "WIDGET_INITIALIZE",
            config: config,
          },
          "*"
        );
      }, 100);
    }

    // Show widget first
    iframe.style.display = "block";

    // Hide the widget button when widget is open
    if (button) {
      button.style.display = "none";
    }
  }

  // Hide widget
  function hideWidget() {
    var iframe = document.getElementById("eka-widget-iframe");
    var button = document.querySelector(".eka-widget-button");

    if (iframe) {
      // Notify React app that widget is closing
      iframe.contentWindow.postMessage(
        {
          type: "WIDGET_CLOSING",
        },
        "*"
      );

      iframe.style.display = "none";
    }

    // Show the widget button when widget is closed
    if (button) {
      button.style.display = "flex";
    }
  }

  // Listen for messages from React app
  window.addEventListener("message", function (event) {
    if (event.data.type === "WIDGET_CLOSE_REQUESTED") {
      hideWidget();
    }
  });

  // Initialize widget
  function initWidget(config) {
    config = Object.assign({}, defaultConfig, config);

    // Create isolated CSS
    createIsolatedCSS();

    // Create and append widget button
    var button = createWidgetButton(config);
    document.body.appendChild(button);

    console.log(
      "Eka Medical Assistant Widget loader initialized with config:",
      config
    );
  }

  // Global API
  window.EkaMedAssist = {
    init: initWidget,
    show: showWidget,
    hide: hideWidget,
    toggle: toggleWidget,
    config: defaultConfig,
  };
})();
