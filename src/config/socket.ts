import type { SocketIOConfig } from "../types/socket";

// Environment-based configuration
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Default Socket.IO configuration
export const defaultSocketConfig: SocketIOConfig = {
  url: isDevelopment
    ? "http://localhost:3001" // Development server
    : "https://apollo-api.yourdomain.com", // Production server
  options: {
    transports: ["websocket", "polling"],
    timeout: 20000,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    maxReconnectionAttempts: 5,
    autoConnect: false,
    query: {
      client: "web-widget",
      version: "1.0.0",
    },
  },
  userId: undefined, // Will be set dynamically
  username: undefined, // Will be set dynamically
  roomId: undefined, // Will be set dynamically
};

// Configuration for different environments
export const socketConfigs = {
  development: {
    ...defaultSocketConfig,
    url: "http://localhost:3001",
    options: {
      ...defaultSocketConfig.options,
      timeout: 10000, // Shorter timeout for development
    },
  },
  staging: {
    ...defaultSocketConfig,
    url: "https://staging-apollo-api.yourdomain.com",
  },
  production: {
    ...defaultSocketConfig,
    url: "https://apollo-api.yourdomain.com",
    options: {
      ...defaultSocketConfig.options,
      timeout: 30000, // Longer timeout for production
      reconnectionAttempts: 10, // More reconnection attempts
    },
  },
};

// Get configuration based on current environment
export function getSocketConfig(environment?: string): SocketIOConfig {
  const env = environment || (isDevelopment ? "development" : "production");
  return (
    socketConfigs[env as keyof typeof socketConfigs] || defaultSocketConfig
  );
}

// Create configuration with user-specific data
export function createUserSocketConfig(
  userId: string,
  username: string,
  roomId?: string,
  environment?: string
): SocketIOConfig {
  const baseConfig = getSocketConfig(environment);

  return {
    ...baseConfig,
    userId,
    username,
    roomId,
    options: {
      ...baseConfig.options,
      auth: {
        userId,
        username,
        timestamp: Date.now(),
        ...baseConfig.options?.auth,
      },
    },
  };
}

// Configuration for different user types
export const userTypeConfigs = {
  patient: {
    roomId: "patient-support",
    options: {
      query: {
        userType: "patient",
        client: "web-widget",
        version: "1.0.0",
      },
    },
  },
  doctor: {
    roomId: "doctor-support",
    options: {
      query: {
        userType: "doctor",
        client: "web-widget",
        version: "1.0.0",
      },
    },
  },
  admin: {
    roomId: "admin-support",
    options: {
      query: {
        userType: "admin",
        client: "web-widget",
        version: "1.0.0",
      },
    },
  },
};

// Create configuration for specific user type
export function createUserTypeSocketConfig(
  userId: string,
  username: string,
  userType: keyof typeof userTypeConfigs,
  environment?: string
): SocketIOConfig {
  const baseConfig = getSocketConfig(environment);
  const userTypeConfig = userTypeConfigs[userType];

  return {
    ...baseConfig,
    userId,
    username,
    roomId: userTypeConfig.roomId,
    options: {
      ...baseConfig.options,
      ...userTypeConfig.options,
      auth: {
        userId,
        username,
        userType,
        timestamp: Date.now(),
        ...baseConfig.options?.auth,
      },
    },
  };
}
