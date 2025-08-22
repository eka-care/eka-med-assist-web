// Production Configuration
export const PRODUCTION_CONFIG = {
  WEBSOCKET_URL: "wss://your-websocket-server.com/ws/med-assist/session",
  API_BASE_URL: "https://d4e4d5a82013.ngrok-free.app",
  WIDGET_URL: "https://your-vercel-domain.vercel.app",
  ENVIRONMENT: "production",
  BASE_API_URL: "//matrix.dev.eka.care"
};

// Update this after Vercel deployment
export const getWidgetUrl = () => {
  // This will be replaced with your actual Vercel domain
  return PRODUCTION_CONFIG.WIDGET_URL;
};

export const getApiUrl = () => {
  return PRODUCTION_CONFIG.API_BASE_URL;
};

export const getWebSocketUrl = () => {
  return PRODUCTION_CONFIG.WEBSOCKET_URL;
};
