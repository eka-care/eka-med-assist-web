import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@ui/index";

// For standalone development - create widget if root element exists
if (document.getElementById("root")) {
  createRoot(document.getElementById("root")!).render(
    <ThemeProvider defaultTheme="doctor-light">
      <App />
    </ThemeProvider>
  );
}

// Widget initialization function for external use
function initializeEkaWidget(config: any = {}) {
  console.log("Initializing Eka Medical Assistant Widget with config:", config);

  // Create a unique container ID
  const containerId =
    "eka-widget-container-" + Math.random().toString(36).substr(2, 9);

  // Create container element
  const container = document.createElement("div");
  container.id = containerId;
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    z-index: 999999;
    font-family: system-ui, sans-serif;
  `;

  // Add to document body
  document.body.appendChild(container);

  // Create React root
  const root = createRoot(container);

  // Render the widget with theme provider
  root.render(
    <ThemeProvider defaultTheme={config.theme || "doctor-light"}>
      <App />
    </ThemeProvider>
  );

  console.log("Eka Medical Assistant Widget rendered successfully!");

  // Return cleanup function
  return {
    destroy: () => {
      root.unmount();
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    },
    containerId,
    container,
  };
}

// Make widget globally available
if (typeof window !== "undefined") {
  (window as any).EkaMedAssistWidget = {
    init: initializeEkaWidget,
  };
  console.log("EkaMedAssistWidget exposed globally");
}

// Export for library builds
export { initializeEkaWidget as init };
export default {
  init: initializeEkaWidget,
};
