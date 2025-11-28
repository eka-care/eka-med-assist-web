import { ThemeProvider } from "@ui/index";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// import ErrorBoundary from "./components/ErrorBoundary.tsx";
//import "./widget-element";

// For standalone development - create widget if root element exists
if (document.getElementById("root")) {
  console.log("Rendering App in standalone mode");
  createRoot(document.getElementById("root")!).render(
    <ThemeProvider defaultTheme="client" primaryColor="#007C9E">
      <App />
    </ThemeProvider>
  );
}

// // Widget initialization function for external use
// function initializeEkaWidget(config: any = {}) {
//   console.log("Initializing Eka Medical Assistant Widget with config:", config);

//   // Create the custom element which encapsulates Shadow DOM
//   const el = document.createElement("eka-med-assist-widget") as any;
//   if (config?.theme) {
//     el.setAttribute("theme", config.theme);
//   }

//   // Set the config on the element so it can access callbacks
//   if (el.setConfig) {
//     el.setConfig(config);
//   }

//   document.body.appendChild(el);

//   console.log("Eka Medical Assistant Web Component mounted successfully!");

//   // Return cleanup function compatible with loader expectations
//   return {
//     destroy: () => {
//       console.log("Destroying widget instance");
//       if (document.body.contains(el)) {
//         el.remove();
//       }
//     },
//     containerId: "eka-med-assist-shadow",
//     container: el,
//   };
// }

// // Export the init function as default for IIFE build
// // Vite will wrap this in var EkaMedAssistWidget = ...
// export default {
//   init: initializeEkaWidget,
// };
