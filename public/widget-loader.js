(function () {
  "use strict";

  // Widget configuration
  var defaultConfig = {
    theme: "client",
    position: "bottom-right",
    scriptUrl: "https://cdn.ekacare.co/apollo/widget.js",
    cssUrl: "https://cdn.ekacare.co/apollo/assets/widget.css",
    mode: "widget", // 'widget' or 'full'
    primaryColor: "#007C9E", // optional hex color (e.g., "#007C9E") to auto-generate primary color palette
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

  var Tags = [
    "Ask Apollo AI to book an appointment",
    "Ask Apollo AI to find a doctor",
    "Ask Apollo AI about a disease",
  ];

  var smallTags = [
    "To Book an Appointment",
    "To Find a Doctor",
    "About a Disease",
  ];
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

      /* Stage 2: Oval with text (Desktop) / Subtract Component (Mobile) */
      .eka-widget-button.stage-2 {
        width: 252px;
        border-radius: 24px;
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #fff;
        border: 4px solid rgba(211, 211, 211, 0.5);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 99px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .eka-widget-button.stage-2:hover:not(.is-mobile) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .eka-stage-2-content {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 12px;
        padding: 0;
      }

      .eka-stage-2-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .eka-stage-2-title {
        font-size: 18px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.2;
        margin: 0;
      }

      .eka-stage-2-subtitle {
        font-size: 14px;
        font-weight: 500;
        color: #1f2937;
        line-height: 1.3;
        margin: 0;
      }

      .eka-stage-2-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: transparent !important;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Subtract Component for Mobile Stage 2 */
      .eka-widget-button.stage-2.is-mobile {
        width: fit-content;
        height: fit-content;
        min-width: 0;
        min-height: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        border: none;
        padding: 0;
        position: fixed;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
        right: 20px;
        left: auto;
        transform: none;
        z-index: 2147483647;
      }

      .eka-widget-button.stage-2.is-mobile:hover {
        transform: none;
        box-shadow: none;
      }

      @media (max-width: 768px) {
        .eka-widget-button.stage-2.is-mobile {
          width: calc(100vw - 32px);
          max-width: 358px;
          height: fit-content;
          left: 50%;
          right: auto;
          transform: translateX(-50%);
          bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
        }

        .eka-widget-button.stage-2.is-mobile:hover {
          transform: translateX(-50%);
          box-shadow: none;
        }

        .eka-subtract-container {
          width: 100%;
          height: auto;
          white-space: normal;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
        }
      }

      .eka-subtract-container {
        position: relative;
        width: fit-content;
        height: fit-content;
        min-width: 0;
        min-height: 0;
        cursor: pointer;
        display: inline-block;
      }

      .eka-subtract-svg {
        display: block;
        width: 100%;
        height: auto;
        position: relative;
        z-index: 1;
        aspect-ratio: 358 / 91;
      }

      .eka-subtract-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        padding: 12px 16px;
        pointer-events: none;
        z-index: 2;
      }

      .eka-subtract-text {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        justify-content: space-between;
        pointer-events: auto;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (max-width: 768px) {
        .eka-subtract-text {
          flex-grow: 1;
          margin-right: 8px;
          white-space: normal;
        }
      }

      .eka-subtract-text span {
        display: inline-block;
        background: linear-gradient(90deg, #017594 0%, #00B3E2 50%, #017594 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .eka-subtract-search-icon {
        width: 24px;
        height: 24px;
        position: relative;
        pointer-events: none;
        flex-shrink: 0;
      }

      .eka-lottie-search-container {
        width: 24px;
        height: 24px;
        position: relative;
        pointer-events: none;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .eka-lottie-search-container.desktop {
        width: 32px;
        height: 32px;
      }

      .eka-subtract-close {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color:rgb(19, 19, 19);
        font-size: 22px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        pointer-events: auto;
        line-height: 1;
        padding: 0;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .eka-subtract-close:hover {
        opacity: 0.7;
        background: rgba(0, 0, 0, 0.05);
      }

      /* Stage 3: Full overlay with floating elements */
      .eka-widget-button.stage-3 {
        width: auto;
        height: auto;
        background: transparent;
        box-shadow: none;
        bottom: 20px;
        right: 20px;
        pointer-events: none;
      }

      /* Desktop Stage 3 positioning */
      .eka-widget-button.stage-3:not(.is-mobile) {
        bottom: 20px;
        right: 20px;
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

      /* Desktop Stage 3 - New Design */
      .eka-stage-3-desktop {
        display: flex;
        width: 295px;
        height: 296px;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        border-radius: 24px;
        border: 4px solid rgba(211, 211, 211, 0.50);
        background: linear-gradient(180deg,rgb(191, 238, 251) 0%, rgb(252, 252, 252) 100%);
        box-shadow:  0 25px 50px -12px rgba(0, 0, 0, 0.25);
        padding: 24px 20px 20px 20px;
        position: relative;
        pointer-events: auto;
      }

      .eka-stage-3-desktop::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 24px;
        padding: 1px;
        background: linear-gradient(180deg,rgb(208, 241, 250) 0%, rgb(255, 255, 255) 100%);
        -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
        mask-composite: exclude;
        pointer-events: none;
        z-index: -1;
      }

      .eka-stage-3-desktop-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .eka-stage-3-desktop-title {
        font-size: 20px;
        font-weight: 700;
        color: #00708E;
        margin: 0;
        line-height: 1.2;
      }

      .eka-stage-3-desktop-subtitle {
        font-size: 14px;
        font-weight: 400;
        color: #767676;
        margin: 4px 0 0 0;
        line-height: 1.2;
      }

      .eka-stage-3-desktop-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #334155;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        padding: 0;
        line-height: 1;
      }

      .eka-stage-3-desktop-close:hover {
        opacity: 0.7;
      }

      .eka-stage-3-desktop-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
        flex: 1;
        justify-content: flex-end;
        padding: 0;
        margin-bottom: 0;
      }

      .eka-stage-3-desktop-illustration {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0;
      }

      .eka-stage-3-desktop-thinking {
        position: absolute;
        top: -20px;
        left: -20px;
        transform: none;
      }

      .eka-stage-3-desktop-input {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 24px;
        border: 2px solid transparent;
        background: linear-gradient(#FFF, #FFF) padding-box,
                    linear-gradient(180deg, #1DC6F4 0%, #007C9E 50%, #047493 100%) border-box;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 0;
      }

      .eka-stage-3-desktop-input:hover {
        box-shadow: 0 2px 8px rgba(29, 198, 244, 0.3);
        background: linear-gradient(#FFF, #FFF) padding-box,
                    linear-gradient(180deg, #1DC6F4 0%, #00B3E2 50%, #007C9E 100%) border-box;
      }

      .eka-stage-3-desktop-input-text {
        flex: 1;
        font-size: 14px;
        color: #00B3E2;
        font-weight: 500;
        border: none;
        outline: none;
        background: transparent;
        pointer-events: none;
      }

      .eka-stage-3-desktop-input-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .eka-stage-3-desktop-input-icon .eka-lottie-search-container.desktop {
        width: 16px;
        height: 16px;
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
        font-size: 22px;
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

        .eka-widget-button.stage-2:not(.is-mobile) {
          width: 280px;
          height: 60px;
        }

        .eka-widget-button.stage-2:not(.is-mobile) {
          width: 280px;
          height: 60px;
        }

        .eka-subtract-container {
          width: 100%;
          height: auto;
          white-space: normal;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
        }

        .eka-subtract-text {
          font-size: 16px;
        }

        .eka-subtract-text span {
          font-size: 16px;
        }

        .eka-subtract-content {
          padding: 2px 20px;
          padding-bottom: 32px;
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

  // Load Lottie Player (simple web component, no npm install needed)
  function loadLottiePlayer(callback) {
    if (customElements.get("lottie-player")) {
      callback();
      return;
    }

    if (document.getElementById("eka-lottie-player-loader")) {
      document
        .getElementById("eka-lottie-player-loader")
        .addEventListener("load", callback, { once: true });
      return;
    }

    var script = document.createElement("script");
    script.id = "eka-lottie-player-loader";
    script.src =
      "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js";
    script.onload = callback;
    script.onerror = function () {
      console.error("Failed to load Lottie Player");
    };
    document.head.appendChild(script);
  }

  // Initialize Lottie search animation (simple approach)
  function initLottieSearch(container) {
    var lottieData = {
      nm: "Main Scene",
      ddd: 0,
      h: 24,
      w: 24,
      meta: { g: "@lottiefiles/creator 1.68.0" },
      layers: [
        {
          ty: 0,
          nm: "1",
          sr: 1,
          st: 0,
          op: 1801.802,
          ip: 0,
          hd: false,
          ln: "104",
          ddd: 0,
          bm: 0,
          hasMask: false,
          ao: 0,
          ks: {
            a: { a: 0, k: [256, 256] },
            s: { a: 0, k: [6, 6, 95.238] },
            sk: { a: 0, k: 0 },
            p: { a: 0, k: [12.263, 14.263, 0] },
            r: { a: 0, k: 0 },
            sa: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
          w: 512,
          h: 512,
          refId: "1_copy_1332077a-b3b1-446f-8cce-3ebd58c1b5c7",
          ind: 1,
        },
      ],
      v: "5.7.0",
      fr: 60,
      op: 181,
      ip: 0,
      assets: [
        {
          nm: "1",
          id: "1_copy_1332077a-b3b1-446f-8cce-3ebd58c1b5c7",
          fr: 29.97,
          layers: [
            {
              ty: 4,
              nm: "Star ",
              sr: 1,
              st: 0,
              op: 182.182,
              ip: 0,
              hd: false,
              ln: "91",
              ddd: 0,
              bm: 0,
              hasMask: false,
              ao: 0,
              ks: {
                a: { a: 0, k: [412.243, 184.965, 0] },
                s: { a: 0, k: [96, 96, 98.969] },
                sk: { a: 0, k: 0 },
                p: { a: 0, k: [306.426, 140.556, 0] },
                r: { a: 0, k: 0 },
                sa: { a: 0, k: 0 },
                o: { a: 0, k: 100 },
              },
              shapes: [
                {
                  ty: "gr",
                  bm: 0,
                  hd: false,
                  nm: "Small Shine 2",
                  it: [
                    {
                      ty: "sh",
                      bm: 0,
                      hd: false,
                      nm: "Path 1",
                      d: 1,
                      ks: {
                        a: 0,
                        k: {
                          c: true,
                          i: [
                            [1.065, -2.127],
                            [0, 0],
                            [0.553, -0.277],
                            [0, 0],
                            [-2.106, -1.054],
                            [0, 0],
                            [-0.276, -0.553],
                            [0, 0],
                            [-1.054, 2.106],
                            [0, 0],
                            [-0.553, 0.277],
                            [0, 0],
                            [2.159, 1.017],
                            [0, 0],
                            [0.284, 0.595],
                            [0, 0],
                          ],
                          o: [
                            [0, 0],
                            [-0.276, 0.553],
                            [0, 0],
                            [-2.106, 1.054],
                            [0, 0],
                            [0.553, 0.277],
                            [0, 0],
                            [1.054, 2.106],
                            [0, 0],
                            [0.277, -0.553],
                            [0, 0],
                            [2.134, -1.068],
                            [0, 0],
                            [-0.596, -0.281],
                            [0, 0],
                            [-1.026, -2.146],
                          ],
                          v: [
                            [-2.538, -12.265],
                            [-5.31, -6.723],
                            [-6.588, -5.445],
                            [-12.246, -2.615],
                            [-12.246, 2.499],
                            [-6.588, 5.329],
                            [-5.31, 6.607],
                            [-2.48, 12.265],
                            [2.634, 12.265],
                            [5.464, 6.607],
                            [6.742, 5.329],
                            [12.246, 2.576],
                            [12.185, -2.567],
                            [6.688, -5.156],
                            [5.328, -6.51],
                            [2.598, -12.219],
                          ],
                        },
                      },
                    },
                    {
                      ty: "gf",
                      bm: 0,
                      hd: false,
                      nm: "Gradient Fill 1",
                      e: { a: 0, k: [0.302, -14.281] },
                      g: {
                        p: 5,
                        k: {
                          a: 0,
                          k: [
                            0, 0, 0.48627450980392156, 0.6196078431372549,
                            0.275, 0.03529411764705882, 0.6431372549019608,
                            0.8117647058823529, 0.551, 0.07058823529411765, 0.8,
                            1, 0.775, 0.03529411764705882, 0.6431372549019608,
                            0.8117647058823529, 1, 0, 0.48627450980392156,
                            0.6196078431372549,
                          ],
                        },
                      },
                      t: 1,
                      a: { a: 0, k: 0 },
                      h: { a: 0, k: 0 },
                      s: { a: 0, k: [0.387, 13.872] },
                      r: 1,
                      o: { a: 0, k: 100 },
                    },
                    {
                      ty: "tr",
                      a: { a: 0, k: [0, 0] },
                      s: {
                        a: 1,
                        k: [
                          {
                            o: { x: 0.333, y: 0 },
                            i: { x: 0.833, y: 3.394 },
                            s: [110, 110],
                            t: 19.199,
                          },
                          {
                            o: { x: 0.333, y: 0.465 },
                            i: { x: 0.667, y: 1 },
                            s: [120, 120],
                            t: 33.601,
                          },
                          {
                            o: { x: 0.333, y: 0 },
                            i: { x: 0.667, y: 1 },
                            s: [0, 0],
                            t: 50.4,
                          },
                          { s: [110, 110], t: 64.799 },
                        ],
                      },
                      sk: { a: 0, k: 0 },
                      p: { a: 0, k: [349.092, 218.086] },
                      r: { a: 0, k: 360 },
                      sa: { a: 0, k: 0 },
                      o: { a: 0, k: 100 },
                    },
                  ],
                },
                {
                  ty: "gr",
                  bm: 0,
                  hd: false,
                  nm: "Small Shine",
                  it: [
                    {
                      ty: "sh",
                      bm: 0,
                      hd: false,
                      nm: "Path 1",
                      d: 1,
                      ks: {
                        a: 0,
                        k: {
                          c: true,
                          i: [
                            [2.212, -4.423],
                            [0, 0],
                            [1.149, -0.575],
                            [0, 0],
                            [-4.379, -2.19],
                            [0, 0],
                            [-0.575, -1.15],
                            [0, 0],
                            [-2.19, 4.379],
                            [0, 0],
                            [-1.149, 0.575],
                            [0, 0],
                            [4.488, 2.114],
                            [0, 0],
                            [0.59, 1.236],
                            [0, 0],
                          ],
                          o: [
                            [0, 0],
                            [-0.575, 1.149],
                            [0, 0],
                            [-4.379, 2.191],
                            [0, 0],
                            [1.149, 0.575],
                            [0, 0],
                            [2.19, 4.379],
                            [0, 0],
                            [0.575, -1.15],
                            [0, 0],
                            [4.437, -2.219],
                            [0, 0],
                            [-1.239, -0.584],
                            [0, 0],
                            [-2.133, -4.461],
                          ],
                          v: [
                            [-5.275, -25.495],
                            [-11.038, -13.975],
                            [-13.694, -11.319],
                            [-25.456, -5.436],
                            [-25.456, 5.194],
                            [-13.694, 11.077],
                            [-11.038, 13.734],
                            [-5.154, 25.495],
                            [5.475, 25.495],
                            [11.359, 13.734],
                            [14.015, 11.077],
                            [25.456, 5.354],
                            [25.33, -5.336],
                            [13.904, -10.719],
                            [11.075, -13.532],
                            [5.401, -25.4],
                          ],
                        },
                      },
                    },
                    {
                      ty: "gf",
                      bm: 0,
                      hd: false,
                      nm: "Gradient Fill 1",
                      e: { a: 0, k: [-0.46, -27.942] },
                      g: {
                        p: 5,
                        k: {
                          a: 0,
                          k: [
                            0, 0, 0.48627450980392156, 0.6196078431372549,
                            0.276, 0.03529411764705882, 0.6431372549019608,
                            0.8117647058823529, 0.551, 0.07058823529411765, 0.8,
                            1, 0.776, 0.03529411764705882, 0.6431372549019608,
                            0.8117647058823529, 1, 0, 0.48627450980392156,
                            0.6196078431372549,
                          ],
                        },
                      },
                      t: 1,
                      a: { a: 0, k: 0 },
                      h: { a: 0, k: 0 },
                      s: { a: 0, k: [-0.067, 27.994] },
                      r: 1,
                      o: { a: 0, k: 100 },
                    },
                    {
                      ty: "tr",
                      a: { a: 0, k: [0, 0] },
                      s: {
                        a: 1,
                        k: [
                          {
                            o: { x: 0.333, y: 0 },
                            i: { x: 0.667, y: 5.332 },
                            s: [100, 100],
                            t: 14.399,
                          },
                          {
                            o: { x: 0.333, y: 0.525 },
                            i: { x: 0.667, y: 1 },
                            s: [110, 110],
                            t: 28.113,
                          },
                          {
                            o: { x: 0.333, y: 0 },
                            i: { x: 0.667, y: 1 },
                            s: [0, 0],
                            t: 46.398,
                          },
                          { s: [100, 100], t: 62.399 },
                        ],
                      },
                      sk: { a: 0, k: 0 },
                      p: { a: 0, k: [329.094, 109.576] },
                      r: { a: 0, k: 360 },
                      sa: { a: 0, k: 0 },
                      o: { a: 0, k: 100 },
                    },
                  ],
                },
                {
                  ty: "gr",
                  bm: 0,
                  hd: false,
                  nm: "Big Shine",
                  it: [
                    {
                      ty: "sh",
                      bm: 0,
                      hd: false,
                      nm: "Path 1",
                      d: 1,
                      ks: {
                        a: 0,
                        k: {
                          c: true,
                          i: [
                            [4.009, -8.014],
                            [0, 0],
                            [2.083, -1.042],
                            [0, 0],
                            [-7.934, -3.969],
                            [0, 0],
                            [-1.041, -2.082],
                            [0, 0],
                            [-3.969, 7.934],
                            [0, 0],
                            [-2.083, 1.042],
                            [0, 0],
                            [8.132, 3.83],
                            [0, 0],
                            [1.07, 2.238],
                            [0, 0],
                          ],
                          o: [
                            [0, 0],
                            [-1.041, 2.082],
                            [0, 0],
                            [-7.934, 3.969],
                            [0, 0],
                            [2.083, 1.042],
                            [0, 0],
                            [3.969, 7.934],
                            [0, 0],
                            [1.042, -2.082],
                            [0, 0],
                            [8.039, -4.021],
                            [0, 0],
                            [-2.245, -1.057],
                            [0, 0],
                            [-3.864, -8.084],
                          ],
                          v: [
                            [-9.559, -46.197],
                            [-20.001, -25.323],
                            [-24.814, -20.51],
                            [-46.126, -9.849],
                            [-46.126, 9.411],
                            [-24.814, 20.072],
                            [-20.001, 24.885],
                            [-9.34, 46.197],
                            [9.921, 46.197],
                            [20.582, 24.885],
                            [25.395, 20.072],
                            [46.126, 9.702],
                            [45.897, -9.669],
                            [25.193, -19.423],
                            [20.067, -24.519],
                            [9.786, -46.024],
                          ],
                        },
                      },
                    },
                    {
                      ty: "gf",
                      bm: 0,
                      hd: false,
                      nm: "Gradient Fill 1",
                      e: { a: 0, k: [0.625, -50.917] },
                      g: {
                        p: 5,
                        k: {
                          a: 0,
                          k: [
                            0, 0, 0.48627450980392156, 0.6196078431372549,
                            0.228, 0.03529411764705882, 0.6431372549019608,
                            0.8117647058823529, 0.455, 0.07058823529411765, 0.8,
                            1, 0.728, 0.03529411764705882, 0.6431372549019608,
                            0.8117647058823529, 1, 0, 0.48627450980392156,
                            0.6196078431372549,
                          ],
                        },
                      },
                      t: 1,
                      a: { a: 0, k: 0 },
                      h: { a: 0, k: 0 },
                      s: { a: 0, k: [-0.594, 53.054] },
                      r: 1,
                      o: { a: 0, k: 100 },
                    },
                    {
                      ty: "tr",
                      a: { a: 0, k: [0, 0] },
                      s: {
                        a: 1,
                        k: [
                          {
                            o: { x: 0.333, y: 0 },
                            i: { x: 0.667, y: 5.332 },
                            s: [100, 100],
                            t: 4.8,
                          },
                          {
                            o: { x: 0.333, y: 0.525 },
                            i: { x: 0.667, y: 1 },
                            s: [110, 110],
                            t: 18.513,
                          },
                          {
                            o: { x: 0.333, y: 0 },
                            i: { x: 0.667, y: 1 },
                            s: [0, 0],
                            t: 36.799,
                          },
                          { s: [100, 100], t: 52.8 },
                        ],
                      },
                      sk: { a: 0, k: 0 },
                      p: { a: 0, k: [389.728, 162.723] },
                      r: { a: 0, k: 360 },
                      sa: { a: 0, k: 0 },
                      o: { a: 0, k: 100 },
                    },
                  ],
                },
              ],
              ind: 1,
            },
            {
              ty: 4,
              nm: "Search_new Outlines",
              sr: 1,
              st: 0,
              op: 1801.802,
              ip: 0,
              hd: false,
              ln: "16",
              ddd: 0,
              bm: 0,
              hasMask: false,
              ao: 0,
              ks: {
                a: { a: 0, k: [400, 400, 0] },
                s: { a: 0, k: [68, 68, 68] },
                sk: { a: 0, k: 0 },
                p: { a: 0, k: [256, 256] },
                r: { a: 0, k: 0 },
                sa: { a: 0, k: 0 },
                o: { a: 0, k: 100 },
              },
              shapes: [
                {
                  ty: "gr",
                  bm: 0,
                  hd: false,
                  nm: "Group 3",
                  it: [
                    {
                      ty: "sh",
                      bm: 0,
                      hd: false,
                      nm: "Path 1",
                      d: 1,
                      ks: {
                        a: 0,
                        k: {
                          c: false,
                          i: [
                            [0, 0],
                            [0, 0],
                          ],
                          o: [
                            [0, 0],
                            [0, 0],
                          ],
                          v: [
                            [30.625, 29.183],
                            [-115.934, -110.474],
                          ],
                        },
                      },
                    },
                    {
                      ty: "st",
                      bm: 0,
                      hd: false,
                      nm: "Stroke 1",
                      lc: 2,
                      lj: 2,
                      ml: 4,
                      o: { a: 0, k: 100 },
                      w: { a: 0, k: 50 },
                      c: { a: 0, k: [0, 0.4863, 0.6196] },
                    },
                    {
                      ty: "tr",
                      a: { a: 0, k: [0, 0] },
                      s: { a: 0, k: [100, 100] },
                      sk: { a: 0, k: 0 },
                      p: { a: 0, k: [560.898, 564.003] },
                      r: { a: 0, k: 0 },
                      sa: { a: 0, k: 0 },
                      o: { a: 0, k: 100 },
                    },
                  ],
                },
                {
                  ty: "gr",
                  bm: 0,
                  hd: false,
                  nm: "Group 4",
                  it: [
                    {
                      ty: "sh",
                      bm: 0,
                      hd: false,
                      nm: "Path 1",
                      d: 1,
                      ks: {
                        a: 0,
                        k: {
                          c: false,
                          i: [
                            [0, 0],
                            [80.758, -7.555],
                            [7.556, 80.758],
                            [-80.758, 7.554],
                          ],
                          o: [
                            [7.555, 80.758],
                            [-80.759, 7.556],
                            [-7.555, -80.758],
                            [0, 0],
                          ],
                          v: [
                            [146.134, -17.45],
                            [13.672, 142.355],
                            [-146.134, 9.893],
                            [-13.671, -149.911],
                          ],
                        },
                      },
                    },
                    {
                      ty: "st",
                      bm: 0,
                      hd: false,
                      nm: "Stroke 1",
                      lc: 2,
                      lj: 2,
                      ml: 4,
                      o: { a: 0, k: 100 },
                      w: { a: 0, k: 50 },
                      c: { a: 0, k: [0, 0.4863, 0.6196] },
                    },
                    {
                      ty: "tr",
                      a: { a: 0, k: [0, 0] },
                      s: { a: 0, k: [100, 100] },
                      sk: { a: 0, k: 0 },
                      p: { a: 0, k: [321.491, 325.825] },
                      r: { a: 0, k: 0 },
                      sa: { a: 0, k: 0 },
                      o: { a: 0, k: 100 },
                    },
                  ],
                },
              ],
              ind: 2,
            },
          ],
        },
      ],
    };

    loadLottiePlayer(function () {
      if (container) {
        // Create lottie-player element (simple web component)
        var player = document.createElement("lottie-player");
        player.setAttribute(
          "src",
          "data:application/json;base64," + btoa(JSON.stringify(lottieData))
        );
        player.setAttribute("background", "transparent");
        player.setAttribute("speed", "1");
        // Check if it's desktop (not mobile) for larger icon
        var isMobile = window.innerWidth <= 768;
        var isDesktop = !isMobile;
        var iconSize = isDesktop ? "32px" : "24px";
        player.setAttribute(
          "style",
          "width: " + iconSize + "; height: " + iconSize + ";"
        );
        player.setAttribute("loop", "");
        player.setAttribute("autoplay", "");
        container.appendChild(player);
      }
    });
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
      // Stage 2: Oval with text (Desktop) / Subtract Component (Mobile)
      button.className = isMobile
        ? "eka-widget-button stage-2 is-mobile"
        : "eka-widget-button stage-2";

      if (isMobile) {
        // Mobile: Subtract Component (Speech Bubble)
        button.innerHTML = `
          <div class="eka-subtract-container" data-name="Subtract">
            <svg class="eka-subtract-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 358 91" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M18.3955 1.53711H339.602C348.91 1.53711 356.456 9.08311 356.456 18.3916V43.1709H356.485C356.489 43.9673 356.494 44.9447 356.499 46.1338L356.5 46.1396C356.561 54.1919 350.654 60.0254 342.561 60.0254H339.397C339.264 60.0257 339.066 60.0267 338.806 60.0273C338.285 60.0286 337.517 60.03 336.523 60.0322C334.536 60.0367 331.649 60.043 328.049 60.0498C320.849 60.0635 310.798 60.0799 299.397 60.0908C281.597 60.1079 260.506 60.1101 241.833 60.0693C241.786 60.0316 241.739 60.0004 241.689 59.9795C241.633 59.9716 241.555 59.9641 241.534 59.9629C241.524 59.9624 241.507 59.9612 241.5 59.9609C241.488 59.9606 241.477 59.961 241.472 59.9609C241.452 59.9606 241.424 59.9601 241.398 59.96C241.287 59.9596 241.033 59.9603 240.618 59.9609C238.951 59.9635 234.611 59.9744 225.995 60C217.157 60.0264 210.906 61.928 206.196 64.8633C201.501 67.79 198.466 71.667 195.955 75.3965C193.384 79.2153 191.485 82.6441 188.882 85.2559C186.403 87.7432 183.346 89.3926 178.54 89.3926C174.292 89.3926 171.191 87.7636 168.396 85.1982C165.509 82.5501 163.089 79.0578 160.07 75.2734C157.11 71.5621 153.678 67.7265 148.958 64.835C144.213 61.9281 138.252 60.0255 130.295 60.0254H18.3965C18.3959 60.0299 18.3955 60.11 18.3955 61.5254V60.0254H15.4375C7.3457 60.0252 1.44543 54.1899 1.5 46.1348C1.52031 43.1436 1.54102 40.788 1.54102 40.417V18.3916C1.54109 9.0832 9.08712 1.53725 18.3955 1.53711Z" 
                fill="white" 
                stroke="url(#paint0_linear_979_5815)" 
                stroke-width="3"
              />
              <defs>
                <linearGradient 
                  id="paint0_linear_979_5815" 
                  x1="0" 
                  y1="45.4648" 
                  x2="358" 
                  y2="45.4648" 
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stop-color="#00ADDC" />
                  <stop offset="0.5" stop-color="#03ABD8" />
                  <stop offset="1" stop-color="#00A3CE" />
                </linearGradient>
              </defs>
            </svg>
            <div class="eka-subtract-content">
              <div class="eka-subtract-text" data-action="open">
                <span id="eka-subtract-text-span">Ask Apollo AI to book an appointment</span>
                <div class="eka-lottie-search-container"></div>
              </div>
            </div>
             <button class="eka-subtract-close" data-action="close">×</button>
          </div>
        `;

        // Initialize Lottie animation for search icon
        var lottieContainer = button.querySelector(
          ".eka-lottie-search-container"
        );
        if (lottieContainer) {
          initLottieSearch(lottieContainer);
        }
      } else {
        // Desktop: Original Oval with text
        button.innerHTML = `
          <div class="eka-stage-2-content" data-action="open">
            <div class="eka-stage-2-text">
              <p class="eka-stage-2-title">Ask Apollo AI</p>
              <p class="eka-stage-2-subtitle" id="eka-desktop-subtitle-span">To Book an Appointment</p>
            </div>
            <div class="eka-stage-2-icon">
              <div class="eka-lottie-search-container desktop"></div>
            </div>
          </div>
        `;
        // Initialize Lottie animation for desktop search icon
        var desktopLottie = button.querySelector(
          ".eka-lottie-search-container.desktop"
        );
        if (desktopLottie) {
          initLottieSearch(desktopLottie);
        }

        // Rotate small tags for desktop (similar to mobile)
        var currentDesktopTagIndex = 0;
        var desktopTagInterval = setInterval(function () {
          var desktopSubtitle = button.querySelector(
            "#eka-desktop-subtitle-span"
          );
          if (desktopSubtitle) {
            desktopSubtitle.textContent = smallTags[currentDesktopTagIndex];
            currentDesktopTagIndex =
              (currentDesktopTagIndex + 1) % smallTags.length;
          } else {
            // Element no longer exists, clear the interval
            clearInterval(desktopTagInterval);
          }
        }, 3000);
      }
    } else if (widgetState.stage === 3) {
      // Stage 3: Full overlay with floating elements
      if (!isMobile) {
        // Desktop: New design with illustration
        button.className = "eka-widget-button stage-3";
        button.style.position = "fixed";
        button.style.bottom = "20px";
        button.style.right = "20px";
        button.innerHTML = `
          <div class="eka-stage-3-desktop">
            <button class="eka-stage-3-desktop-close" data-action="close">×</button>
            <div class="eka-stage-3-desktop-header">
              <div>
                <h3 class="eka-stage-3-desktop-title">Ask Apollo AI</h3>
                <p class="eka-stage-3-desktop-subtitle">Your Personal health assistant</p>
              </div>
            </div>
            <div class="eka-stage-3-desktop-content">
              <div class="eka-stage-3-desktop-illustration">
                <svg class="eka-stage-3-desktop-thinking" width="40" height="16" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="39" height="15" rx="7.5" fill="white" stroke="#E2E8F0" stroke-width="1"/>
                  <circle cx="10" cy="8" r="1.5" fill="#64748B"/>
                  <circle cx="16" cy="8" r="1.5" fill="#64748B"/>
                  <circle cx="22" cy="8" r="1.5" fill="#64748B"/>
                  <circle cx="28" cy="8" r="1.5" fill="#64748B"/>
                </svg>
                <svg width="82" height="132" viewBox="0 0 82 132" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M43.2966 43.638V60.2166L41.3575 63.4154L27.4249 67.1829L22.656 60.8353L22.7379 58.2084L22.9685 50.7627L27.9831 48.0976L43.2966 43.638Z" fill="#E3ACA7"/>
                  <path opacity="0.3" d="M43.2965 43.6378V50.1576C41.0556 53.3351 35.9635 60.2536 32.9571 61.9439C30.2782 63.4492 25.5124 60.3472 22.7378 58.2083L22.9685 50.7625L27.983 48.0974L43.2965 43.6378Z" fill="#C66D67"/>
                  <path d="M59.2863 99.6807L61.2306 143.594L9.85135 144.71L9.73867 136.83L9.57389 125.249C9.57389 125.249 8.28651 125.275 6.38362 124.412C6.33153 124.389 6.2805 124.364 6.22841 124.34C2.8978 122.734 0.361321 118.428 0.0594094 114.009C-0.246755 109.52 0.569679 81.5734 3.93536 73.005C7.30104 64.4378 24.0295 59.8474 24.0295 59.8474L28.7527 66.1748L39.3888 64.9161L44.3055 59.8474H46.2498C62.0311 64.8417 64.4326 70.0625 64.4326 70.0625L59.2863 99.6807Z" fill="#87BAE5"/>
                  <path d="M24.3484 141.432C26.6412 140.554 28.944 139.713 31.2488 138.879L38.1607 136.379L39.8887 135.756L41.612 135.121L42.4752 134.808L43.3349 134.485L44.195 134.164C44.4832 134.06 44.7695 133.953 45.0548 133.842L46.7703 133.188L48.4771 132.512C49.0462 132.286 49.6053 132.039 50.173 131.808L50.3857 131.72L50.594 131.625L51.0109 131.432L51.8502 131.054C51.3199 131.36 50.7938 131.682 50.2496 131.967L49.4287 132.386C49.1535 132.523 48.8825 132.67 48.6036 132.798L46.9312 133.573C46.3698 133.822 45.8037 134.06 45.2399 134.304C44.6774 134.552 44.1062 134.776 43.537 135.006L42.6827 135.351L41.8253 135.686C41.2528 135.907 40.6789 136.125 40.1044 136.34L38.3775 136.978C37.8009 137.188 37.2207 137.387 36.6424 137.592C36.0635 137.795 35.486 138.002 34.9038 138.196C33.7408 138.586 32.5785 138.979 31.4087 139.348C29.0715 140.095 26.7225 140.805 24.3484 141.432Z" fill="#344965"/>
                  <path d="M13.2954 79.7059C13.5783 80.7141 13.7961 81.7324 13.994 82.7535C14.189 83.7752 14.3582 84.8006 14.5037 85.8295C14.6493 86.8585 14.7716 87.8907 14.8647 88.927C14.9554 89.9635 15.0244 91.0033 15.0205 92.0506C14.7609 91.0362 14.5558 90.0166 14.3677 88.9945C14.1821 87.972 14.0167 86.9469 13.8722 85.9187C13.7276 84.8905 13.6017 83.8597 13.4993 82.8252C13.3994 81.7902 13.3172 80.7527 13.2954 79.7059Z" fill="#4694C3"/>
                  <path d="M43.611 58.597L46.2498 59.8476C46.2498 59.8476 45.2785 65.1694 40.0293 67.1321C34.7801 69.0949 27.5225 68.4101 25.3771 65.2607C23.2317 62.1111 23.0054 60.1542 23.0054 60.1542L27.7507 61.2439C27.7507 61.2439 38.4531 64.5765 43.611 58.597Z" fill="#F8F6FA"/>
                  <path opacity="0.2" d="M25.3465 113.436C21.3823 125 15.3005 132.923 9.73853 136.83L9.57376 125.249C9.57376 125.249 8.28638 125.275 6.38348 124.412C6.33139 124.389 6.28036 124.364 6.22827 124.34L6.65244 119.452L21.9086 93.2375L28.2115 88.2953C28.2115 88.2953 30.5035 98.3945 25.3465 113.436Z" fill="#516C87"/>
                  <path d="M70.4178 135.608C69.9745 136.301 69.1421 137.285 68.0886 138.418C63.73 143.108 55.589 150.379 55.589 150.379L48.7588 144.71L59.4543 128.811C59.4543 128.811 59.4543 128.811 59.4554 128.811L59.9093 128.136C68.0822 129.362 70.4178 135.608 70.4178 135.608Z" fill="#E9AFA5"/>
                  <path opacity="0.3" d="M70.4177 135.608C69.9744 136.301 69.142 137.285 68.0885 138.418C64.2391 132.823 59.5393 128.882 59.4553 128.811L59.9093 128.136C68.0821 129.362 70.4177 135.608 70.4177 135.608Z" fill="#B35B55"/>
                  <path d="M64.4323 70.0627C64.4323 70.0627 66.7043 72.4116 71.925 88.1624C77.1458 103.913 82.455 114.001 80.7737 119.664C79.0925 125.327 79.1809 123.557 79.1809 123.557L65.4058 117.066L66.2593 115.312L59.2862 99.6812C59.2862 99.6812 56.6619 90.8646 56.6536 86.9586C56.644 82.4456 56.681 70.4225 64.4323 70.0627Z" fill="#87BAE5"/>
                  <path d="M66.2596 115.312C66.2596 115.312 67.3322 111.746 70.4003 111.042C73.4685 110.338 79.7102 111.394 81.0909 116.625C81.0909 116.625 81.3148 122.761 76.2348 129.551C71.1548 136.342 70.7021 136.995 70.7021 136.995C70.7021 136.995 66.9298 131.362 58.5806 128.495L66.2596 115.312Z" fill="#87BAE5"/>
                  <path d="M66.2593 115.311C66.7708 114.662 67.3362 114.067 67.9203 113.493C68.5067 112.921 69.1173 112.375 69.7529 111.856C70.3885 111.338 71.049 110.848 71.7474 110.407C72.0969 110.187 72.4574 109.981 72.8347 109.804C73.0242 109.717 73.2173 109.635 73.4165 109.57C73.6175 109.511 73.8252 109.451 74.0347 109.469L73.8894 109.517C73.8427 109.537 73.7974 109.561 73.7523 109.582C73.6622 109.625 73.5758 109.679 73.4904 109.73C73.3211 109.84 73.1544 109.951 72.9938 110.073C72.6698 110.312 72.3525 110.561 72.038 110.815L70.1555 112.351C69.5265 112.863 68.8928 113.372 68.2484 113.87C67.6025 114.367 66.949 114.857 66.2593 115.311Z" fill="#4694C3"/>
                  <path d="M66.7522 114.862C67.4675 114.414 68.229 114.054 69.0062 113.735C69.7857 113.421 70.5856 113.154 71.4059 112.951C71.8157 112.849 72.231 112.765 72.6506 112.7C73.0699 112.636 73.4946 112.593 73.9223 112.583C74.3493 112.574 74.7802 112.592 75.2042 112.669C75.625 112.751 76.0482 112.88 76.3984 113.121C75.9906 113.011 75.5838 112.975 75.1767 112.981C74.7701 112.986 74.3651 113.027 73.9622 113.083C73.5593 113.14 73.1574 113.21 72.7573 113.296C72.357 113.379 71.9571 113.469 71.5588 113.57C70.761 113.766 69.966 113.986 69.1676 114.208C68.3689 114.43 67.5696 114.657 66.7522 114.862Z" fill="#4694C3"/>
                  <path d="M73.8557 116.022C73.2052 115.965 72.5727 115.894 71.9414 115.827C71.3107 115.76 70.6835 115.701 70.0569 115.651C69.43 115.597 68.8043 115.573 68.1745 115.552C67.5431 115.531 66.9154 115.554 66.2593 115.557C66.8565 115.294 67.4992 115.129 68.1487 115.051C68.7982 114.977 69.4564 114.958 70.1062 115.015C70.7565 115.067 71.4011 115.173 72.031 115.336C72.6593 115.501 73.2786 115.712 73.8557 116.022Z" fill="#4694C3"/>
                  <path d="M57.9072 80.3394C58.1538 81.9419 58.3376 83.5487 58.4993 85.1573C58.586 85.961 58.65 86.7665 58.7247 87.5712L58.9147 89.9876C59.0316 91.5994 59.121 93.213 59.1897 94.8281C59.2581 96.4432 59.3038 98.06 59.2863 99.6812C59.0389 98.0789 58.8548 96.4719 58.6933 94.8635C58.5323 93.255 58.3919 91.645 58.2789 90.033L58.1241 87.614C58.0839 86.8068 58.0329 86.0005 58.0048 85.1925C57.9366 83.5773 57.8906 81.9606 57.9072 80.3394Z" fill="#4694C3"/>
                  <path d="M46.0755 14.1897L45.2495 10.1734C45.2495 10.1734 45.2081 10.1713 45.1294 10.1681C44.8657 10.1554 44.1811 10.1245 43.1957 10.0841C37.437 9.8524 21.3921 9.32724 18.8301 10.5753C18.677 10.6497 18.5292 10.7475 18.3857 10.8676C16.2702 12.6345 15.1689 19.1947 14.6926 26.3544C14.5395 28.6539 14.4502 31.0171 14.413 33.3016C14.2525 43.1786 16.6614 50.5669 22.2021 52.0924C36.8481 56.1257 45.2495 41.332 45.2495 41.332L47.1482 33.426L48.7024 26.9572L46.0755 14.1897Z" fill="#E9AFA5"/>
                  <path opacity="0.3" d="M43.8816 14.5443C43.8816 14.5443 36.8004 18.97 28.3285 17.0733C19.8565 15.1765 16.9482 11.3831 16.9482 11.3831L17.4476 8.79089H26.6564L41.163 9.48636L44.5937 12.5211L43.8816 14.5443Z" fill="#B35B55"/>
                  <path d="M32.6235 22.0834L38.2304 24.0147" stroke="#374060" stroke-width="1.91353" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M21.5988 21.3199L17.4475 21.9426" stroke="#374060" stroke-width="1.91353" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M20.0444 31.5213C20.8729 31.5213 21.5444 30.402 21.5444 29.0213C21.5444 27.6406 20.8729 26.5213 20.0444 26.5213C19.216 26.5213 18.5444 27.6406 18.5444 29.0213C18.5444 30.402 19.216 31.5213 20.0444 31.5213Z" fill="#374060"/>
                  <path d="M35.0444 31.5213C35.8729 31.5213 36.5444 30.6259 36.5444 29.5213C36.5444 28.4167 35.8729 27.5213 35.0444 27.5213C34.216 27.5213 33.5444 28.4167 33.5444 29.5213C33.5444 30.6259 34.216 31.5213 35.0444 31.5213Z" fill="#374060"/>
                  <path d="M23.1934 35.97C23.1934 35.97 24.804 37.0224 25.0409 37.68C25.2777 38.3376 23.8834 38.6007 23.8834 38.6007L23.1934 35.97Z" fill="#D28686"/>
                  <path d="M25.6145 28.0407L22.9382 35.9686L23.8109 38.2957" stroke="#CE716F" stroke-width="0.637842" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M22.5444 43.063C22.7793 43.5358 23.165 43.9226 23.6265 44.1903C24.0889 44.4546 24.6535 44.581 25.1972 44.4937C25.4679 44.4513 25.7293 44.365 25.9722 44.2459C26.0889 44.1781 26.2107 44.1196 26.3171 44.0375C26.3713 43.9983 26.4272 43.9618 26.4794 43.9204L26.6306 43.7904C27.0266 43.437 27.3351 43.0039 27.5444 42.5211C27.1313 42.8249 26.7467 43.1254 26.3426 43.3581C26.1434 43.4793 25.938 43.5747 25.7338 43.6606C25.5269 43.7378 25.3187 43.7974 25.1076 43.8291C24.6859 43.8964 24.2537 43.8463 23.8235 43.7069C23.3932 43.5653 22.9693 43.3427 22.5444 43.063Z" fill="#4C3234"/>
                  <path d="M53.9866 29.7467L53.0734 31.2817L47.1479 33.426L45.8987 33.8778L45.2684 31.5539V29.4926C42.903 24.712 42.7754 19.6103 42.9987 16.5263C43.1252 14.7574 43.3676 13.6528 43.3676 13.6528C43.7067 12.0806 44.3584 10.9622 45.1291 10.1681C47.1245 8.10892 49.9161 8.22586 50.1202 8.23755C50.1276 8.23861 50.1319 8.23862 50.1319 8.23862C52.3176 8.33535 54.2906 8.4406 57.0737 14.3545C59.8569 20.2673 53.9866 29.7467 53.9866 29.7467Z" fill="#1D2047"/>
                  <path d="M50.1202 8.23771C49.7269 9.1679 49.2634 9.77491 49.2634 9.77491L46.0753 14.1898L44.5933 16.2426L42.9987 16.5265C43.1252 14.7575 43.3676 13.653 43.3676 13.653C43.3676 13.653 35.6848 19.2766 25.8642 14.9202C22.3805 13.3755 20.0024 11.9999 18.3855 10.8678C16.2699 12.6346 15.1686 19.1948 14.6923 26.3546L14.6913 26.3588C7.8887 20.2238 12.4216 12.4698 12.4875 12.3571C12.3961 12.3826 8.20124 13.5807 7.24235 12.523C6.09636 11.2579 8.11194 8.84685 11.1523 7.57755C14.1927 6.30824 13.2912 5.9064 13.2912 5.9064C8.37877 6.37415 7.81854 6.17004 7.92591 5.44503C8.54568 1.26184 35.9017 -0.696332 41.6295 0.240233C47.3573 1.17786 48.9541 5.55133 48.9541 5.55133C49.1964 4.44043 48.3981 2.67041 47.149 1.83697C45.8988 1.00458 46.2858 0.347604 46.2858 0.347604C47.5625 -0.874927 49.3166 1.30437 50.3722 4.12257C50.9399 5.63744 50.5774 7.15551 50.1202 8.23771Z" fill="#1D2047"/>
                  <path d="M43.3678 13.653C43.3678 13.653 35.685 19.2767 25.8643 14.9202C22.3807 13.3756 20.0026 12 18.3856 10.8678C15.4431 8.80864 15.0146 7.55528 15.0146 7.55528L35.2895 4.62439L40.1201 6.36676L43.051 7.08008L43.1956 10.0843L43.3678 13.653Z" fill="#1D2047"/>
                  <path d="M44.5938 32.5624C44.5938 32.5624 47.9671 26.8032 51.3404 28.2841C54.7138 29.7651 55.6188 33.303 54.1378 36.4295C52.6568 39.556 49.7772 41.8596 44.5938 41.3661" fill="#E9AFA5"/>
                  <path d="M47.0488 38.0269C47.0488 38.0269 47.1648 36.6934 48.0634 36.3455C48.0634 36.3455 47.9568 35.4593 47.7735 34.653C47.5561 33.6964 48.7591 31.1757 50.4984 31.2821C52.2377 31.3886 53.2813 34.4612 52.0058 35.6788C50.9713 36.6663 47.2518 37.1572 47.0488 38.0269Z" fill="#D07271"/>
                  <path opacity="0.3" d="M36.1025 50.2421C36.1025 50.2421 36.9223 47.3354 33.1965 48.0692C29.4709 48.8029 25.1532 50.8348 23.7986 53.7696C22.4441 56.7044 22.6699 59.3409 22.6699 59.3409L26.2538 55.0112L30.7972 52.2125L34.4786 51.004L36.1025 50.2421Z" fill="#B35B55"/>
                  <path d="M37.2156 64.6812C36.1536 67.4558 34.2049 65.6252 34.2049 65.6252C34.2049 65.6252 35.0905 72.1791 34.6769 73.3601C34.2645 74.5412 21.5108 110.556 21.5108 110.556L8.87622 101.935L25.172 73.0061C25.172 73.0061 21.9839 60.8435 22.3974 58.9544C22.3974 58.9544 24.4045 52.8726 28.5962 50.334C32.7879 47.7954 35.504 48.3269 36.0356 49.6845C36.5076 50.8911 34.931 51.5842 33.1249 52.2199C33.1249 52.2199 33.1238 52.2199 33.1227 52.2199C32.8952 52.3007 32.6646 52.3804 32.4339 52.4591C32.4339 52.4591 32.79 52.6473 33.2322 52.9981C33.9115 53.5349 34.796 54.4534 34.9172 55.6579C34.9385 55.8694 34.9363 56.0895 34.9055 56.317C34.8928 56.4073 34.8768 56.4998 34.8545 56.5923C34.8545 56.5923 36.0185 57.9424 36.1387 59.5051C36.1557 59.7156 36.1535 59.9293 36.1248 60.144C36.1238 60.161 36.1217 60.177 36.1195 60.194C36.1195 60.194 38.2786 61.9055 37.2156 64.6812Z" fill="#EFC1BA"/>
                  <path d="M9.63639 99.5671C9.63639 99.5671 19.2543 102.592 22.6418 109.609C22.6418 109.609 17.8631 123.824 11.935 125.215C6.00696 126.606 0.441786 122.432 0.0183654 114.569C-0.225503 110.038 9.63639 99.5671 9.63639 99.5671Z" fill="#87BAE5"/>
                  <path d="M33.2326 52.9983C28.4722 52.8388 24.6802 59.837 24.6802 59.837C24.6802 59.837 24.6802 58.0181 28.2797 54.5301C30.3793 52.4954 32.0749 52.1531 33.1231 52.2201C32.8956 52.3009 32.6649 52.3806 32.4342 52.4593C32.4342 52.4593 32.7903 52.6474 33.2326 52.9983Z" fill="#B35B55"/>
                  <path d="M34.9056 56.3171C30.9723 55.4752 27.1303 60.6842 27.0198 60.8352C29.9113 55.522 33.5141 55.4486 34.9173 55.658C34.9386 55.8696 34.9365 56.0896 34.9056 56.3171Z" fill="#B35B55"/>
                  <path d="M36.1251 60.1441C32.7924 59.0183 29.7637 63.3248 29.7637 63.3248C31.4082 58.8397 34.8611 59.1969 36.1389 59.5052C36.1559 59.7157 36.1538 59.9293 36.1251 60.1441Z" fill="#B35B55"/>
                  <path d="M34.4785 65.8366C34.3675 65.6233 34.3482 65.3976 34.3668 65.1784C34.389 64.9592 34.4597 64.7428 34.5769 64.5474C34.6935 64.3519 34.8677 64.1829 35.0713 64.0694C35.2752 63.9549 35.5211 63.9148 35.7488 63.9704C35.6067 64.1679 35.4899 64.3035 35.3942 64.4532C35.298 64.5994 35.2096 64.7343 35.1213 64.8797C35.0342 65.0252 34.943 65.174 34.8423 65.3324C34.74 65.4912 34.6301 65.6546 34.4785 65.8366Z" fill="#B35B55"/>
                  <path d="M10.1344 99.6086C9.44874 100.428 8.7772 101.258 8.12851 102.102C7.80183 102.522 7.48153 102.946 7.16803 103.374C6.85039 103.798 6.54093 104.228 6.23901 104.662C5.93551 105.094 5.66187 105.547 5.39206 105.998C5.11991 106.447 4.83756 106.884 4.53353 107.308L2.68762 109.89L2.57642 109.854C2.58535 109.29 2.71302 108.74 2.88311 108.213C3.0565 107.685 3.27804 107.177 3.53796 106.694C3.79693 106.211 4.09979 105.754 4.44465 105.333C4.79047 104.911 5.14777 104.502 5.49805 104.091C5.84908 103.68 6.20585 103.275 6.56931 102.878C6.93766 102.485 7.31122 102.097 7.68978 101.716C8.45339 100.958 9.23156 100.219 10.0525 99.5256L10.1344 99.6086Z" fill="#4694C3"/>
                </svg>
              </div>
            </div>
            <div class="eka-stage-3-desktop-input" data-action="open">
              <span class="eka-stage-3-desktop-input-text" id="eka-stage-3-input-text-span">Ask Apollo AI to book an appointment</span>
              <div class="eka-stage-3-desktop-input-icon">
                <div class="eka-lottie-search-container desktop"></div>
              </div>
            </div>
          </div>
        `;

        // Initialize Lottie animation for desktop input icon (smaller size)
        var desktopInputLottie = button.querySelector(
          ".eka-stage-3-desktop-input .eka-lottie-search-container.desktop"
        );
        if (desktopInputLottie) {
          initLottieSearch(desktopInputLottie);
          // Override size after initialization for input icon
          setTimeout(function () {
            var player = desktopInputLottie.querySelector("lottie-player");
            if (player) {
              player.setAttribute("style", "width: 16px; height: 16px;");
            }
          }, 100);
        }

        // Rotate Tags for Stage 3 desktop input (using Tags array, not smallTags)
        var stage3InputText = button.querySelector(
          "#eka-stage-3-input-text-span"
        );
        if (stage3InputText) {
          var currentStage3TagIndex = 0;
          var stage3TagInterval = setInterval(function () {
            var inputTextElement = button.querySelector(
              "#eka-stage-3-input-text-span"
            );
            if (inputTextElement) {
              inputTextElement.textContent = Tags[currentStage3TagIndex];
              currentStage3TagIndex = (currentStage3TagIndex + 1) % Tags.length;
            } else {
              // Element no longer exists, clear the interval
              clearInterval(stage3TagInterval);
            }
          }, 3000);
        }
      }
      // else {
      //   // Mobile: Original Stage 3 design
      //   var messageTimestamp = Date.now();
      //   var messageTimeAgo = formatTimeAgo(messageTimestamp);

      //   button.className = "eka-widget-button stage-3";
      //   button.innerHTML = `
      //     <div class="eka-stage-3-overlay">
      //       <!-- Chat bubble -->
      //       <div class="eka-chat-bubble">
      //         <button class="eka-chat-close" data-action="close">×</button>
      //         <div class="eka-chat-bubble-content" data-action="open">
      //           <div class="eka-chat-avatar">🤖</div>
      //           <div class="eka-chat-message">
      //             <p class="eka-chat-text">Hi 👋🏻 Need help booking an appointment or finding the right doctor?</p>
      //             <p class="eka-chat-timestamp">Apollo Assist • ${messageTimeAgo}</p>
      //           </div>
      //         </div>
      //       </div>

      //       <!-- Pills -->
      //       <div class="eka-pills-container">
      //         <button class="eka-pill" data-action="appointment">
      //           📅 Book an appointment
      //         </button>
      //         <button class="eka-pill focused" data-action="doctor">
      //           🔍 Help me find a doctor
      //         </button>
      //         <button class="eka-pill" data-action="emergency">
      //           🆘 I'm in emergency
      //         </button>
      //       </div>

      //       <!-- Widget icon button -->
      //       <button class="eka-widget-icon-button" data-action="open">
      //         <div class="eka-icon-container"></div>
      //         <div class="eka-notification-badge">1</div>
      //       </button>
      //     </div>
      //   `;

      //   var widgetIcon = button.querySelector(".eka-icon-container");
      //   if (widgetIcon) {
      //     loadApolloIcon(widgetIcon, 32);
      //   }
      // }
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
        let currentTagIndex = 0;

        var mobileTagInterval = setInterval(function () {
          const display = document.getElementById("eka-subtract-text-span");
          if (display) {
            display.textContent = Tags[currentTagIndex];
            currentTagIndex = (currentTagIndex + 1) % Tags.length;
          } else {
            // Element no longer exists, clear the interval
            clearInterval(mobileTagInterval);
          }
        }, 3000);
        // After 3 more seconds, go to stage 3
        //for desktop
        if (window.innerWidth <= 768) return;
        widgetState.stage2Timer = setTimeout(function () {
          if (
            !widgetState.isVisible &&
            widgetState.stage === 2 &&
            !widgetState.isClosed
          ) {
            setStage(3);
          }
        }, 10000);
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

  function handleTagClick(tag, config) {
    console.log("tag clicked", tag);
    window._first_user_message = tag;
    widgetState.firstUserMessage = tag;
    //load Widget
    toggleWidget(config);
  }

  // Common function to handle input field clicks (Stage 2 and Stage 3)
  function handleInputClick(inputText, config) {
    console.log("input clicked", inputText);
    // Extract the actual message from the input text
    var message = inputText.trim();
    if (message) {
      window._first_user_message = message;
      widgetState.firstUserMessage = message;
      //load Widget
      toggleWidget(config);
    }
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
          // Common logic for input field clicks (Stage 2 and Stage 3)
          var inputText = "";

          // Try to find Stage 2 mobile text
          var stage2Text = target.querySelector("#eka-subtract-text-span");
          if (stage2Text) {
            inputText = stage2Text.textContent || stage2Text.innerText;
          } else {
            // Try to find Stage 3 desktop input text
            var stage3Text = target.querySelector(
              ".eka-stage-3-desktop-input-text"
            );
            if (stage3Text) {
              inputText = stage3Text.textContent || stage3Text.innerText;
            } else {
              // Try to find Stage 2 desktop subtitle
              var stage2Subtitle = target.querySelector(
                "#eka-desktop-subtitle-span"
              );
              if (stage2Subtitle) {
                inputText =
                  stage2Subtitle.textContent || stage2Subtitle.innerText;
              } else {
                // Fallback: use the target's text content
                inputText = target.textContent || target.innerText;
              }
            }
          }

          if (inputText) {
            handleInputClick(inputText.trim(), config);
          }
        } else if (
          action === "appointment" ||
          action === "doctor" ||
          action === "emergency"
        ) {
          handlePillClick(action, config);
        } else if (action === "tag") {
          handleTagClick(target.textContent, config);
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

  function getMode() {
    // Find the script tag that loaded this file
    const scripts = document.querySelectorAll(
      'script[src*="widget-loader.js"]'
    );
    let scriptSrc = null;
    let mode = null;

    // Try currentScript first (works for synchronous scripts)
    if (document.currentScript && document.currentScript.src) {
      scriptSrc = document.currentScript.src;
    } else if (scripts.length > 0) {
      // Fallback: find the script tag (use the last one if multiple)
      scriptSrc = scripts[scripts.length - 1].src;
    }

    // Extract mode from query string
    if (scriptSrc) {
      const url = new URL(scriptSrc, window.location.href);
      mode = url.searchParams.get("mode");
    }
    // Use mode from query string if available, otherwise use config.mode
    return mode || defaultConfig.mode;
  }
  // Mount the React widget
  function mountWidget(config) {
    if (!window.EkaMedAssistWidget || !window.EkaMedAssistWidget.init) {
      console.error("EkaMedAssistWidget not available");
      return;
    }

    widgetState.instance = window.EkaMedAssistWidget.init({
      theme: config.theme,
      primaryColor: config.primaryColor,
      onMinimize: function () {
        hideWidget();
        showButton();
      },
      onClose: function () {
        hideWidget();
        showButton();
      },
      mode: config.mode,
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
      return;
    }

    config = Object.assign({}, defaultConfig, config);
    createIsolatedCSS();
    // Initialize from cookie
    initializeFromCookie();

    var mode = getMode();
    if (mode === "full") {
      toggleWidget({ ...config, mode: "full" });
      if (window.EkaMedAssist) {
        window.EkaMedAssist._initialized = true;
      }
    } else {
      var button = createWidgetButton(config);
      document.body.appendChild(button);
      if (window.EkaMedAssist) {
        window.EkaMedAssist._initialized = true;
        window.EkaMedAssist._button = button;
      }
    }
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
