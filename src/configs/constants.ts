const PRODUCTION_CONFIG = {
    WEBSOCKET_URL: "wss://matrix-ws.eka.care",
    BASE_API_URL: "https://matrix.eka.care",
    X_AGENT_ID: "MWZlZDRkYzktMTBmMS00OTFkLWEzNDMtZGM3MzIzZDM5N2VmIzcxNzU5MTc2ODQzNTgzOTA=",
};

const DEVELOPMENT_CONFIG = { // can be used for local development
    WEBSOCKET_URL: "wss://matrix-ws.dev.eka.care",
    BASE_API_URL: "https://matrix.dev.eka.care",
    X_AGENT_ID: "YTA1NWMzNGYtMmQ5ZC00YjU3LTgyNGEtOTMzZDkzYjY3YjQ2Izc3MDg4MTY2OTk2NzI0",
};

const STAGING_CONFIG = {
    WEBSOCKET_URL: "wss://matrix-ws.dev.eka.care",
    BASE_API_URL: "https://matrix.dev.eka.care",
    X_AGENT_ID: "NDBkNmM4OTEtNGEzMC00MDBlLWE4NjEtN2ZkYjliMDY2MDZhI2ItMTYxNDY3NzU2MDQ0MjAz",
};

// Use build mode instead of environment variable to avoid local .env dependency
// This can be overridden at build time with: vite build --mode prod
export const config = import.meta.env.MODE === "prod" ? PRODUCTION_CONFIG : import.meta.env.MODE === "stage" ? STAGING_CONFIG : DEVELOPMENT_CONFIG;