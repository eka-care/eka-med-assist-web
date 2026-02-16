const PRODUCTION_CONFIG = {
    WEBSOCKET_URL: "wss://matrix-ws.eka.care",
    BASE_API_URL: "https://matrix.eka.care",
    X_AGENT_ID: "M2RmNDUzZDgtYTBlYy00NjYzLWFkODktODZlOWMxN2Q3YmI1IzcxNzY0MDYzNjY4OTg5Njg=",
};

const DEVELOPMENT_CONFIG = { // can be used for local development
    WEBSOCKET_URL: "wss://matrix-ws.dev.eka.care",
    BASE_API_URL: "https://matrix.dev.eka.care",
    X_AGENT_ID: "M2RmNDUzZDgtYTBlYy00NjYzLWFkODktODZlOWMxN2Q3YmI1IzcxNzY0MDYzNjY4OTg5Njg=",
};

const STAGING_CONFIG = {
    WEBSOCKET_URL: "wss://matrix-ws.dev.eka.care",
    BASE_API_URL: "https://matrix.dev.eka.care",
    X_AGENT_ID: "NDBkNmM4OTEtNGEzMC00MDBlLWE4NjEtN2ZkYjliMDY2MDZhI2ItMTYxNDY3NzU2MDQ0MjAz",
};

// Use build mode instead of environment variable to avoid local .env dependency
// This can be overridden at build time with: vite build --mode prod
export const config = import.meta.env.MODE === "prod" ? PRODUCTION_CONFIG : import.meta.env.MODE === "stage" ? STAGING_CONFIG : DEVELOPMENT_CONFIG;