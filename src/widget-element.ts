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

  static get observedAttributes() {
    return ["theme"];
  }

  constructor() {
    super();
    this.shadowRootRef = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // Container for React
    this.container = document.createElement("div");
    this.container.id = "root";
    this.container.style.cssText = "all: initial; display: contents;";

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

    // 1) Base isolation + theme vars
    injectCSS(`
        :host { all: initial; contain: content; }
        :host, :host * { box-sizing: border-box; }
        :host { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        :host([hidden]) { display: none; }
        /* Theme variables (define defaults; can be overridden via attributes/config) */
        :host { --color-card: #ffffff; --color-foreground: #111827; --color-border: #e5e7eb; --color-muted-foreground: #6b7280; }
        /* Full-screen portal root inside shadow for modals, tooltips, etc. */
        #portal-root { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
      `);

    // 2) Inject compiled widget CSS (fetch bundled CSS and place into shadow)
    // Using a runtime fetch keeps the Shadow DOM stylesheet up-to-date with deployments
    try {
      const cssUrl = new URL("./assets/widget.css", import.meta.url);
      fetch(cssUrl)
        .then((r) => r.text())
        .then((css) => {
          // Inject library styles first
          injectCSS(css);
          // Then enforce our desired font stack after library base resets
          injectCSS(
            `:host { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }`
          );
        })
        .catch(() => {
          /* no-op: widget can still render without CSS */
        });
    } catch (_e) {
      // Ignore if URL resolution fails in certain bundling modes
    }

    const portalRoot = document.createElement("div");
    portalRoot.id = "portal-root";

    this.shadowRootRef.append(this.container, portalRoot);

    // Provide shadow container for portals via context
    const PortalContext = React.createContext(portalRoot as HTMLElement | null);

    const container = this.container;
    if (!container) {
      return;
    }
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
              defaultTheme: (this.getAttribute("theme") ||
                "doctor-light") as any,
            },
            React.createElement(App as unknown as any, {
              config: {
                theme: this.getAttribute("theme") || "doctor-light",
                onClose: () => this.dispatchEvent(new CustomEvent("close")),
                onMinimize: () =>
                  this.dispatchEvent(new CustomEvent("minimize")),
                isProduction: true,
              },
            })
          )
        )
      )
    );

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
