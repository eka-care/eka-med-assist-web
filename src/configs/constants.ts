const PRODUCTION_CONFIG = {
    WEBSOCKET_URL: "wss://matrix.eka.care",
    BASE_API_URL: "https://matrix.eka.care",
    X_AGENT_ID: "MWZlZDRkYzktMTBmMS00OTFkLWEzNDMtZGM3MzIzZDM5N2VmIzc3MDg4MTY2OTk2NzI0",
};

const DEVELOPMENT_CONFIG = {
    WEBSOCKET_URL: "wss://matrix-ws.dev.eka.care",
    BASE_API_URL: "https://matrix.dev.eka.care",
    X_AGENT_ID: "MWZlZDRkYzktMTBmMS00OTFkLWEzNDMtZGM3MzIzZDM5N2VmIzc3MDg4MTY2OTk2NzI0",
};

// Use build mode instead of environment variable to avoid local .env dependency
// This can be overridden at build time with: vite build --mode prod
console.log("import.meta.env.MODE", import.meta.env.MODE);
export const config = import.meta.env.MODE === "prod" ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;