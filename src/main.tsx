import { ThemeProvider } from "@ui/index";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

// For standalone development - create widget if root element exists
if (document.getElementById("root")) {
    console.log("Rendering App in standalone mode");
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
        "eka-widget-container-" + Math.random().toString(36).slice(2, 11);

    // Create container element with isolation classes
    const container = document.createElement("div");
    container.id = containerId;
    container.className = "eka-widget-root"; // Add class for CSS isolation
    container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    z-index: 999999;
    font-family: system-ui, sans-serif;
    isolation: isolate;
  `;

    // Add to document body
    document.body.appendChild(container);

    // Create React root
    const root = createRoot(container);

    // Pass callbacks to App component
    const appConfig = {
        ...config,
        onMinimize: config.onMinimize,
        onClose: config.onClose,
        isProduction: true, // Flag to indicate widget mode
    };

    // Render the widget with theme provider
    root.render(
        <ErrorBoundary>
            <ThemeProvider defaultTheme={config.theme || "doctor-light"}>
                <App config={appConfig} />
            </ThemeProvider>
        </ErrorBoundary>
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

// Export the init function as default for IIFE build
// Vite will wrap this in var EkaMedAssistWidget = ...
export default {
    init: initializeEkaWidget,
};
