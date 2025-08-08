(function () {
  "use strict";

  // Widget configuration
  var config = {
    apiUrl: "https://apollo-api.yourdomain.com", // Apollo's API domain
    theme: "doctor-light", // default theme
    position: "bottom-right", // default position
    zIndex: 9999,
    width: "400px",
    height: "600px",
    brandName: "Apollo Assist", // Customizable brand name
    brandColor: "#215FFF", // Customizable brand color
  };

  // Override config with user options
  if (window.ApolloWidgetConfig) {
    Object.assign(config, window.ApolloWidgetConfig);
  }

  // Create widget container
  function createWidgetContainer() {
    var container = document.createElement("div");
    container.id = "apollo-assist-widget";
    container.style.cssText = `
      position: fixed;
      ${config.position.includes("bottom") ? "bottom: 20px;" : "top: 20px;"}
      ${config.position.includes("right") ? "right: 20px;" : "left: 20px;"}
      width: ${config.width};
      height: ${config.height};
      z-index: ${config.zIndex};
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      background: white;
      overflow: hidden;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    return container;
  }

  // Create toggle button
  function createToggleButton() {
    var button = document.createElement("button");
    button.id = "apollo-assist-toggle";
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/>
      </svg>
    `;
    button.style.cssText = `
      position: fixed;
      ${config.position.includes("bottom") ? "bottom: 20px;" : "top: 20px;"}
      ${config.position.includes("right") ? "right: 20px;" : "left: 20px;"}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${config.brandColor};
      border: none;
      color: white;
      cursor: pointer;
      z-index: ${config.zIndex};
      box-shadow: 0 4px 12px ${config.brandColor}40;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    button.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.1)";
    });

    button.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1)";
    });

    return button;
  }

  // Load widget iframe
  function loadWidget() {
    var iframe = document.createElement("iframe");
    iframe.src = `${config.apiUrl}/widget?theme=${config.theme}`;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    `;

    // Handle iframe messages
    window.addEventListener("message", function (event) {
      if (event.origin !== config.apiUrl) return;

      switch (event.data.type) {
        case "WIDGET_READY":
          showWidget();
          break;
        case "WIDGET_CLOSE":
          hideWidget();
          break;
        case "WIDGET_RESIZE":
          resizeWidget(event.data.width, event.data.height);
          break;
      }
    });

    return iframe;
  }

  // Show/hide widget
  function showWidget() {
    document.getElementById("apollo-assist-widget").style.display = "block";
    document.getElementById("apollo-assist-toggle").style.display = "none";
  }

  function hideWidget() {
    document.getElementById("apollo-assist-widget").style.display = "none";
    document.getElementById("apollo-assist-toggle").style.display = "flex";
  }

  function resizeWidget(width, height) {
    var container = document.getElementById("apollo-assist-widget");
    if (width) container.style.width = width;
    if (height) container.style.height = height;
  }

  // Initialize widget
  function init() {
    // Create elements
    var container = createWidgetContainer();
    var toggleButton = createToggleButton();
    var iframe = loadWidget();

    // Add to page
    container.appendChild(iframe);
    document.body.appendChild(container);
    document.body.appendChild(toggleButton);

    // Add event listeners
    toggleButton.addEventListener("click", showWidget);

    // Add close button to widget
    var closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 18px;
      z-index: 10000;
    `;
    closeButton.addEventListener("click", hideWidget);
    container.appendChild(closeButton);
  }

  // Load when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
