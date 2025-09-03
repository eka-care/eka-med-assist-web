// // Export all Socket.IO related types
// export type {
//   ChatMessage,
//   TypingIndicator,
//   UserStatus,
//   RoomInfo,
//   SocketIOConfig,
// } from "./socket";

export { ConnectionState } from "./socket";

// Export widget types
export type { WidgetConfig, Message } from "./widget";

// Export API types
export type {
  AvailabilityDatesParams,
  AvailabilityDatesResponse,
} from "../api/get-availability-dates";

export type {
  AvailabilitySlotsParams,
  AvailabilitySlotsResponse,
} from "../api/get-availability-slots";
