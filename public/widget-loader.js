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
    var button = document.querySelector(".eka-widget-button");
    // var overlay = document.getElementById("eka-widget-overlay");

    if (iframe && iframe.style.display !== "none") {
      hideWidget();
    } else {
      showWidget(config);
    }
  }

  // Add session management
  var currentSession = null;

  // Enhanced showWidget function
  function showWidget(config) {
    var iframe = document.getElementById("eka-widget-iframe");
    var button = document.querySelector(".eka-widget-button");
    // var overlay = document.getElementById("eka-widget-overlay");

    if (!iframe) {
      iframe = createWidgetIframe(config);
      document.body.appendChild(iframe);
    }

    // Start session before showing widget
    startSessionAndShowWidget(config, iframe);

    // Show widget
    iframe.style.display = "block";
    
    // Hide the widget button when widget is open
    if (button) {
      button.style.display = "none";
    }
    
    //overlay.classList.add("active");
  }

  // New function to handle session and widget display
  async function startSessionAndShowWidget(config, iframe) {
    try {
      const defaultJWTPayload = {
        aud: "androiddoc",
        "b-id": "77088166996724",
        cc: {
          "doc-id": "173658822122884",
          esc: 1,
          "is-d": true,
        },
        dob: "1990-07-03",
        "doc-id": "173658822122884",
        exp: 1754298198,
        fn: "Neha",
        gen: "F",
        iat: 1754294598,
        idp: "mob",
        "is-d": true,
        iss: "emr.eka.care",
        ln: "Jagadeesh",
        mn: "true",
        oid: "173658822122884",
        pri: true,
        r: "IN",
        uuid: "fc452885-83e5-466c-b45c-53e743ff2428",
      };

      // Call your API here
      const response = await fetch(
        "https://matrix.dev.eka.care/med-assist/session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "jwt-payload": JSON.stringify(defaultJWTPayload),
          },
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const sessionData = await response.json();
      currentSession = sessionData;

      // Send session data to React app via postMessage
      iframe.contentWindow.postMessage(
        {
          type: "SESSION_STARTED",
          session: sessionData,
        },
        "*"
      );

      // Show widget
      iframe.style.display = "block";
    } catch (error) {
      console.error("Failed to start session:", error);
      // Handle error - maybe show error message
    }
  }

  // Hide widget
  function hideWidget() {
    var iframe = document.getElementById("eka-widget-iframe");
    var button = document.querySelector(".eka-widget-button");
    // var overlay = document.getElementById("eka-widget-overlay");

    if (iframe) {
      // Notify React app that widget is closing
      iframe.contentWindow.postMessage(
        {
          type: "WIDGET_CLOSING",
        },
        "*"
      );

      iframe.style.display = "none";
      currentSession = null; // Clear session
    }

    // Show the widget button when widget is closed
    if (button) {
      button.style.display = "flex";
    }

    // if (overlay) {
    //   overlay.classList.remove("active");
    // }
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

    // Create overlay
    // var overlay = createOverlay();
    // document.body.appendChild(overlay);

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
