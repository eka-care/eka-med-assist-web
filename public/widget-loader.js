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
        gap: 16px;
        padding: 8px 24px 8px 8px;
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

      /* Subtract Component for Mobile Stage 2 */
      .eka-widget-button.stage-2.is-mobile {
        width: fit-content;
        height: fit-content;
        min-width: 0;
        min-height: 0;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        padding: 0;
        position: fixed;
        bottom: 20px;
        right: 20px;
        left: auto;
        transform: none;
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
        }

        .eka-widget-button.stage-2.is-mobile:hover {
          transform: translateX(-50%);
          box-shadow: none;
        }

        .eka-subtract-container {
          width: 100%;
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
        width: 358px;
        height: 90.8554px;
        position: relative;
        z-index: 1;
      }

      @media (max-width: 768px) {
        .eka-subtract-svg {
          width: calc(100vw - 32px);
          max-width: 358px;
          height: auto;
          aspect-ratio: 358 / 90.8554;
        }
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

      .eka-subtract-close {
        position: absolute;
        bottom: 8px;
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
          height: 100%;
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

    var script = document.createElement("script");
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
        player.setAttribute("style", "width: 24px; height: 24px;");
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
            <svg class="eka-subtract-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 358 90.8554">
              <path 
                d="M18.3955 1.5H339.602C348.91 1.5 356.456 9.046 356.456 18.3545V43.1338H356.485C356.489 43.9301 356.494 44.9076 356.499 46.0967L356.5 46.1025C356.561 54.1548 350.654 59.9883 342.561 59.9883H226.614L226.446 60.0273L225.696 60.2021L225.687 60.2041C217.645 62.1237 211.87 64.9641 207.409 68.1748C202.958 71.3784 199.869 74.9141 197.192 78.1123C194.478 81.3553 192.281 84.1198 189.493 86.1338C186.786 88.0894 183.477 89.3555 178.54 89.3555C169.9 89.3555 165.871 84.2425 159.843 77.5752C153.84 70.936 146.228 63.3276 130.605 60.0205L130.451 59.9883H15.4375C7.3457 59.9881 1.44543 54.1528 1.5 46.0977C1.52031 43.1065 1.54102 40.7509 1.54102 40.3799V18.3545C1.54109 9.04609 9.08712 1.50014 18.3955 1.5Z" 
                fill="white" 
                stroke="url(#paint0_linear_1_9)" 
                stroke-width="3" 
              />
              <defs>
                <linearGradient 
                  gradientUnits="userSpaceOnUse" 
                  id="paint0_linear_1_9" 
                  x1="0" 
                  x2="358" 
                  y1="45.4277" 
                  y2="45.4277"
                >
                  <stop stop-color="#017594" />
                  <stop offset="0.5" stop-color="#00B3E2" />
                  <stop offset="1" stop-color="#017594" />
                </linearGradient>
              </defs>
            </svg>
            <div class="eka-subtract-content">
              <div class="eka-subtract-text" data-action="tag">
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
          loadApolloIcon(iconEl, 36);
        }
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
        let currentTagIndex = 0;
        const display = document.getElementById("eka-subtract-text-span");

        setInterval(() => {
          display.textContent = Tags[currentTagIndex];
          currentTagIndex = (currentTagIndex + 1) % Tags.length;
        }, 3000);
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

  function handleTagClick(tag, config) {
    console.log("tag clicked", tag);
    window._first_user_message = tag;
    widgetState.firstUserMessage = tag;
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
