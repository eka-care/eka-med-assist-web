/**
 * TypeScript definitions for EkaMedAssist Widget Loader
 *
 * Usage:
 * ```typescript
 * // After loading widget-loader.js
 * window.EkaMedAssist.initMedAssist({
 *   widgetTitle: "My Chat Assistant",
 *   firstBotMessage: "Hello! How can I help?",
 *   onClose: () => console.log("Widget closed"),
 * });
 * ```
 */

export type ThemeType =
  | "doctor-light"
  | "doctor-dark"
  | "patient-light"
  | "patient-dark";

/**
 * Configuration options for initializing the widget
 */
export interface EkaMedAssistConfig {
  /** Widget title displayed in the header */
  widgetTitle?: string;

  /** First message sent by the bot when widget opens */
  firstBotMessage?: string;

  /** First message sent by the user (auto-sent on open) */
  firstUserMessage?: string;

  /** Theme for the widget */
  theme?: ThemeType;

  /** Callback function called when widget is closed */
  onClose?: () => void;

  /** Custom script URL (optional, defaults to CDN) */
  scriptUrl?: string;

  /** Custom CSS URL (optional, defaults to CDN) */
  cssUrl?: string;

  /** Widget position (optional, defaults to "bottom-right") */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

/**
 * Widget instance returned from initialization
 */
export interface EkaMedAssistInstance {
  /** Destroy and remove the widget */
  destroy: () => void;

  /** Container element ID */
  containerId: string;

  /** Container element reference */
  container: HTMLElement;
}

/**
 * Global API exposed by widget-loader.js
 */
export interface EkaMedAssistGlobal {
  /**
   * Initialize the widget with the provided configuration
   * @param config - Configuration options for the widget
   * @example
   * ```typescript
   * window.EkaMedAssist.initMedAssist({
   *   widgetTitle: "Chat Support",
   *   firstBotMessage: "Hello! How can I help you today?",
   *   onClose: () => {
   *     console.log("Widget closed");
   *   }
   * });
   * ```
   */
  initMedAssist: (config?: EkaMedAssistConfig) => void;

  /**
   * Close the widget
   */
  closeMedAssist: () => void;

  /** Internal flag to track initialization state */
  _initialized?: boolean;
}

/**
 * Widget initialization function exposed by widget.js bundle
 */
export interface EkaMedAssistWidgetGlobal {
  /**
   * Initialize the widget instance
   * @param config - Configuration options
   * @returns Widget instance with destroy method
   */
  init: (config: EkaMedAssistConfig) => EkaMedAssistInstance;
}

declare global {
  interface Window {
    /** Global API for initializing and controlling the widget */
    EkaMedAssist: EkaMedAssistGlobal;

    /** Widget bundle initialization function (internal use) */
    EkaMedAssistWidget: EkaMedAssistWidgetGlobal;
  }
}

export {};
