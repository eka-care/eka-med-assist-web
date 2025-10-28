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
        padding: 8px 12px;
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
      .eka-widget-button.stage-3 {
        width: auto;
        height: auto;
        background: transparent;
        box-shadow: none;
        bottom: 0;
        right: 0;
        pointer-events: none;
      }

      .eka-stage-3-overlay {
        position: fixed;
        bottom: 20px;  /* Same as widget button */
        right: 20px;   /* Same as widget button */
        width: auto;
        height: auto;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 16px;
        z-index: 2147483647;
      }

      /* Chat bubble */
      .eka-chat-bubble {
        position: relative;
        background: #fde047;
        border-radius: 16px;
        padding: 14px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 340px;
        pointer-events: auto;
        order: 1;
        z-index: 2147483647;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .eka-chat-bubble:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .eka-chat-bubble-content {
        display: flex;
        gap: 12px;
        align-items: center;
        padding-right: 20px;
      }

      .eka-chat-avatar {
        font-size: 28px;
        line-height: 1;
        flex-shrink: 0;
        padding-bottom: 24px;
      }

      .eka-chat-message {
        flex: 1;
      }

      .eka-chat-text {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 500;
        color: #000000;
        line-height: 1.3;
      }

      .eka-chat-timestamp {
        margin: 0;
        font-size: 11px;
        color: #666666;
        line-height: 1.2;
      }

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
        font-size: 18px;
        color: #666666;
        line-height: 1;
        padding: 0;
        border-radius: 50%;
        transition: background-color 0.2s ease;
      }

      .eka-chat-close:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      /* Pills container */
      .eka-pills-container {
        position: relative;
        display: flex;
        flex-direction: row;
        gap: 8px;
        justify-content: flex-end;
        flex-wrap: wrap;
        order: 2;
        z-index: 2147483647;
      }

      .eka-pill {
        background: #fde047;
        border: none;
        border-radius: 24px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 500;
        pointer-events: auto;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        white-space: nowrap;
        transition: all 0.2s ease;
        color: #000000;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .eka-pill:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .eka-pill.focused {
        border: 2px solid #fde047;
        padding: 8px 16px;
      }

      /* Widget icon button */
      .eka-widget-icon-button {
        position: relative;
        width: 54px;
        height: 54px;
        background: white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        border: none;
        padding: 0;
        order: 3;
        z-index: 2147483647;
      }

      .eka-widget-icon-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }

      .eka-notification-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ff4444;
        color: #ffffff;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border: 2px solid #ffffff;
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

        .eka-chat-bubble {
          max-width: 300px;
          padding: 12px 14px;
        }

        .eka-chat-avatar {
          font-size: 24px;
          padding-bottom: 24px;
        }

        .eka-chat-text {
          font-size: 13px;
        }

        .eka-pills-container {
        display: none;
          // bottom: 80px;
          // right: 16px;
          // max-width: calc(100vw - 32px);
        }

        .eka-pill {
          font-size: 12px;
          padding: 8px 14px;
        }

        .eka-pill.focused {
          padding: 6px 12px;
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

      .eka-chat-bubble,
      .eka-pills-container,
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

  // Load Apollo icon
  function loadApolloIcon(container, size) {
    var scale = size / 200;
    var blueSize = 80 * scale;
    var yellowSize = 60 * scale;
    var blueLeft = 60 * scale;
    var blueTop = 90 * scale;
    var yellowLeft = 40 * scale;
    var yellowTop = 50 * scale;

    if (!document.getElementById("apollo-icon-styles")) {
      var styleElement = document.createElement("style");
      styleElement.id = "apollo-icon-styles";
      styleElement.textContent = `
        @keyframes spinBlue {
          0% { transform: rotate(0deg); }
          22% { transform: rotate(147deg); }
          38% { transform: rotate(311deg); }
          61% { transform: rotate(73deg); }
          79% { transform: rotate(222deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinYellow {
          0% { transform: rotate(0deg); }
          18% { transform: rotate(260deg); }
          36% { transform: rotate(105deg); }
          59% { transform: rotate(330deg); }
          83% { transform: rotate(185deg); }
          100% { transform: rotate(540deg); }
        }
        @keyframes fadeA {
          0%, 35% { opacity: 1; }
          45%, 65% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fadeB {
          0%, 35% { opacity: 0; }
          45%, 65% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(styleElement);
    }

    container.innerHTML = `
      <div style="width: ${size}px; height: ${size}px; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; background: #fff;">
        <div style="position: absolute; border-radius: 50%; overflow: hidden; width: ${blueSize}px; height: ${blueSize}px; left: ${blueLeft}px; top: ${blueTop}px;">
          <div style="position: absolute; inset: 0; border-radius: 50%;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(0deg, #2582a1, #fde047); background-size: 200% 200%; animation: spinBlue 16s linear infinite, fadeA 16s ease-in-out infinite;"></div>
            <div style="position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(0deg, #fde047, #2582a1); background-size: 200% 200%; animation: spinBlue 16s linear infinite, fadeB 16s ease-in-out infinite;"></div>
          </div>
        </div>
        <div style="position: absolute; border-radius: 50%; overflow: hidden; width: ${yellowSize}px; height: ${yellowSize}px; left: ${yellowLeft}px; top: ${yellowTop}px;">
          <div style="position: absolute; inset: 0; border-radius: 50%;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(0deg, #fde047, #2582a1); background-size: 200% 200%; animation: spinYellow 17s linear infinite 0.8s, fadeB 16s ease-in-out infinite 0.8s;"></div>
            <div style="position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(0deg, #2582a1, #fde047); background-size: 200% 200%; animation: spinYellow 17s linear infinite 0.8s, fadeA 16s ease-in-out infinite 0.8s;"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Update button appearance based on stage
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
    } else if (widgetState.stage === 3) {
      // Stage 3: Full overlay with floating elements
      var messageTimestamp = Date.now();
      var messageTimeAgo = formatTimeAgo(messageTimestamp);

      button.className = "eka-widget-button stage-3";
      button.innerHTML = `
        <div class="eka-stage-3-overlay">
          <!-- Chat bubble -->
          <div class="eka-chat-bubble">
            <button class="eka-chat-close" data-action="close">×</button>
            <div class="eka-chat-bubble-content" data-action="open">
              <div class="eka-chat-avatar">🤖</div>
              <div class="eka-chat-message">
                <p class="eka-chat-text">Hi 👋🏻 Need help booking an appointment or finding the right doctor?</p>
                <p class="eka-chat-timestamp">Apollo Assist • ${messageTimeAgo}</p>
              </div>
            </div>
          </div>

          <!-- Pills -->
          <div class="eka-pills-container">
            <button class="eka-pill" data-action="appointment">
              📅 Book an appointment
            </button>
            <button class="eka-pill focused" data-action="doctor">
              🔍 Help me find a doctor
            </button>
            <button class="eka-pill" data-action="emergency">
              🆘 I'm in emergency
            </button>
          </div>

          <!-- Widget icon button -->
          <button class="eka-widget-icon-button" data-action="open">
            <div class="eka-icon-container"></div>
            <div class="eka-notification-badge">1</div>
          </button>
        </div>
      `;

      var widgetIcon = button.querySelector(".eka-icon-container");
      if (widgetIcon) {
        loadApolloIcon(widgetIcon, isMobile ? 32 : 40);
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

  //function to format time ago
  function formatTimeAgo(time) {
    var now = Date.now();
    var timeDiff = now - time;
    var seconds = Math.floor(timeDiff / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (seconds < 60) {
      return "Just now";
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 30) {
      return `${days}d ago`;
    }
  }
  // Set widget stage
  function setStage(stage) {
    console.log("setStage", stage);
    clearTimeout(widgetState.inactivityTimer);
    clearTimeout(widgetState.stage2Timer);

    widgetState.stage = stage;
    updateButtonAppearance();

    if (stage === 1) {
      resetInactivityTimer();
    }
  }

  // Handle pill click
  function handlePillClick(action, config) {
    console.log("Pill clicked:", action);
    // Add your logic here for each action
    setStage(1);
    var firstUserMessage = "";
    switch (action) {
      case "appointment":
        firstUserMessage = "Book an appointment";
        break;
      case "doctor":
        firstUserMessage = "Help me find a doctor";
        break;
      case "emergency":
        firstUserMessage = "I'm in emergency";
        break;
      default:
        firstUserMessage = "Other";
    }

    //store the first user message in the widget state
    window._first_user_message = firstUserMessage;
    widgetState.firstUserMessage = firstUserMessage;

    //load Widget
    toggleWidget(config);
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
      console.log("click", e);
      var target = e.target.closest("[data-action]");
      if (target) {
        var action = target.getAttribute("data-action");
        e.stopPropagation();
        if (action === "close") {
          console.log("close");
          setStage(1);
          widgetState.isClosed = true;
          setCookie("medassist-preferences", "close");
        } else if (action === "open") {
          toggleWidget(config);
        } else if (
          action === "appointment" ||
          action === "doctor" ||
          action === "emergency"
        ) {
          handlePillClick(action, config);
        }
      } else {
        // Main button click
        console.log("no target found, toggling widget");
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
      firstUserMessage: widgetState?.firstUserMessage || "",
    });

    widgetState.isVisible = true;
    widgetState.firstUserMessage = null;
    window._first_user_message = null;
    hideButton();
  }

  // Toggle widget visibility
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

  // Show widget
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

  // Hide widget
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
      console.warn("Widget already initialized");
      return;
    }

    config = Object.assign({}, defaultConfig, config);
    createIsolatedCSS();

    // Initialize from cookie
    initializeFromCookie();

    var button = createWidgetButton(config);
    document.body.appendChild(button);

    if (window.EkaMedAssist) {
      window.EkaMedAssist._initialized = true;
      window.EkaMedAssist._button = button;
    }

    console.log("Widget initialized");
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
    handlePillClick: handlePillClick,
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
