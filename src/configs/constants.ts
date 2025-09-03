const PRODUCTION_CONFIG = {
    WEBSOCKET_URL: "wss://matrix-ws.eka.care",
    ENVIRONMENT: "production",
    BASE_API_URL: "https://matrix.eka.care",
    X_AGENT_ID: "MWZlZDRkYzktMTBmMS00OTFkLWEzNDMtZGM3MzIzZDM5N2VmIzc3MDg4MTY2OTk2NzI0"
};

const DEVELOPMENT_CONFIG = {
    WEBSOCKET_URL: "wss:///8a42ca76c9d9.ngrok-free.app",
    ENVIRONMENT: "development",
    BASE_API_URL: "https://8a42ca76c9d9.ngrok-free.app",
    X_AGENT_ID: "MWZlZDRkYzktMTBmMS00OTFkLWEzNDMtZGM3MzIzZDM5N2VmIzc3MDg4MTY2OTk2NzI0"
};

export const config = import.meta.env.VITE_IS_DEV === "false" ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;