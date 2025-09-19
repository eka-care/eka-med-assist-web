// Register once
import { createRoot } from "react-dom/client";
import React from "react";
import { ThemeProvider } from "@ui/index";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

class EkaMedAssistWidgetElement extends HTMLElement {
  private shadowRootRef!: ShadowRoot;
  private reactRoot: import("react-dom/client").Root | null = null;
  private container!: HTMLDivElement;
  private config: any = {};
  //   private cssLoaded: boolean = false;

  static get observedAttributes() {
    return ["theme"];
  }

  constructor() {
    super();
    this.shadowRootRef = this.attachShadow({ mode: "open" });
  }

  // Method to set config from external widget loader
  setConfig(config: any) {
    this.config = config;
  }

  private createLoadingStyles() {
    return `
      :host { contain: content; }
      :host, :host * { box-sizing: border-box; }
      :host { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      :host([hidden]) { display: none; }
      
      /* Theme variables (define defaults; can be overridden via attributes/config) */
      :host { 
        --color-card: #ffffff; 
        --color-foreground: #111827; 
        --color-border: #e5e7eb; 
        --color-muted-foreground: #6b7280;
        --color-muted: #f9fafb;
      }
      
      /* Loading state styles */
      .widget-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        width: 100%;
        background: var(--color-card);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      }
      
      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--color-muted);
        border-top: 3px solid var(--color-foreground);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Full-screen portal root inside shadow for modals, tooltips, etc. */
      #portal-root { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
      
      /* Ensure widget container has maximum z-index */
      :host { z-index: 2147483647; }
      
      /* Hide content until CSS is loaded */
      .widget-content {
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      }
      
      .widget-content.loaded {
        opacity: 1;
      }
    `;
  }

  connectedCallback() {
    // Container for React
    this.container = document.createElement("div");
    this.container.id = "root";
    this.container.style.cssText = "display: contents;";

    // Styles: adopt via Constructable Stylesheets if supported
    const injectCSS = (cssText: string) => {
      if (
        "adoptedStyleSheets" in Document.prototype &&
        "replaceSync" in CSSStyleSheet.prototype
      ) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        this.shadowRootRef.adoptedStyleSheets = [
          ...this.shadowRootRef.adoptedStyleSheets,
          sheet,
        ];
      } else {
        const style = document.createElement("style");
        style.textContent = cssText;
        this.shadowRootRef.appendChild(style);
      }
    };

    // 1) Inject loading styles immediately
    injectCSS(this.createLoadingStyles());

    // Create portal root
    const portalRoot = document.createElement("div");
    portalRoot.id = "portal-root";

    // Add loading container initially
    const loadingContainer = document.createElement("div");
    loadingContainer.className = "widget-loading";
    loadingContainer.innerHTML = '<div class="loading-spinner"></div>';

    this.shadowRootRef.append(loadingContainer, this.container, portalRoot);

    // 2) Load main CSS asynchronously and then render React
    this.loadCSSAndRender(injectCSS, portalRoot, loadingContainer);
  }

  private async loadCSSAndRender(
    injectCSS: (cssText: string) => void,
    portalRoot: HTMLElement,
    loadingContainer: HTMLElement
  ) {
    try {
      // Use CSS URL from config if available, otherwise fallback to import.meta.url
      let cssUrl: string;
      if (this.config?.cssUrl) {
        cssUrl = this.config.cssUrl;
      } else {
        // Fallback to constructing URL from import.meta.url
        cssUrl = new URL("./assets/widget.css", import.meta.url).toString();
      }

      // In widget-element.ts, add preload link first
      const preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "style";
      preloadLink.href = cssUrl;
      this.shadowRootRef.appendChild(preloadLink);
      
      // Use link tag in shadow DOM (recommended for external CSS)
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;

      // Add to shadow root - this bypasses CORS for stylesheets
      this.shadowRootRef.appendChild(link);

      // Wait for CSS to load
      await new Promise((resolve) => {
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        };

        link.onload = () => {
          console.log("CSS loaded successfully via link tag");
          cleanup();
          resolve(void 0);
        };
        link.onerror = () => {
          console.warn(
            "Failed to load CSS via link tag, proceeding with basic styles"
          );
          cleanup();
          resolve(void 0); // Don't reject, just proceed
        };

        // Timeout after 5 seconds
        timeoutId = setTimeout(() => {
          console.warn("CSS loading timeout, proceeding with basic styles");
          resolve(void 0);
        }, 5000);
      });

      // Enforce font stack after library base resets
      injectCSS(
        `:host { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }`
      );
    } catch (error) {
      console.warn(
        "Failed to load widget CSS, proceeding with basic styles:",
        error
      );
    }

    // Now render React app
    this.renderReactApp(portalRoot, loadingContainer);
  }

  private renderReactApp(
    portalRoot: HTMLElement,
    loadingContainer: HTMLElement
  ) {
    // Provide shadow container for portals via context
    const PortalContext = React.createContext(portalRoot as HTMLElement | null);

    const container = this.container;
    if (!container) {
      return;
    }

    // Create app config with proper callbacks
    const appConfig = {
      theme: this.getAttribute("theme") || "doctor-light",
      onMinimize:
        this.config.onMinimize ||
        (() => this.dispatchEvent(new CustomEvent("minimize"))),
      onClose:
        this.config.onClose ||
        (() => this.dispatchEvent(new CustomEvent("close"))),
    };

    // Add loaded class to container for smooth transition
    container.className = "widget-content";

    this.reactRoot = createRoot(container);
    this.reactRoot!.render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(
          PortalContext.Provider,
          { value: portalRoot },
          React.createElement(
            ThemeProvider as any,
            {
              defaultTheme: appConfig.theme as any,
            },
            React.createElement(App as unknown as any, {
              config: appConfig,
            })
          )
        )
      )
    );

    // Remove loading container and show content with transition
    setTimeout(() => {
      loadingContainer.remove();
      container.classList.add("loaded");
    }, 100);

    // Optionally expose portal container globally for libraries that read document.body
    (this.shadowRootRef as any).__EKA_PORTAL_ROOT__ = portalRoot;
  }

  attributeChangedCallback(
    name: string,
    _oldVal: string | null,
    _newVal: string | null
  ) {
    if (name === "theme" && this.reactRoot) {
      // Re-render with new theme if needed; or store in state via custom event
    }
  }

  disconnectedCallback() {
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }
  }
}

if (!customElements.get("eka-med-assist-widget")) {
  customElements.define("eka-med-assist-widget", EkaMedAssistWidgetElement);
}

// Export a helper for programmatic usage
export function createEkaWidget(attrs?: { theme?: string }) {
  const el = document.createElement("eka-med-assist-widget");
  if (attrs?.theme) el.setAttribute("theme", attrs.theme);
  document.body.appendChild(el);
  return el;
}
