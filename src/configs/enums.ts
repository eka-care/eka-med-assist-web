export enum WEBSOCKET_SERVER_EVENTS {
  PING = "ping",
  PONG = "pong",
  CONNECTION_ESTABLISHED = "conn",
  AUTH = "auth",
  CHAT = "chat",
  STREAM = "stream",
  END_OF_STREAM = "eos",
  SYNC = "sync",
  ERROR = "err",
}

export enum WEBSOCKET_CUSTOM_EVENTS {
  TIPS = "tips",
  PROGRESS_MESSAGE = "progress_message",
  STREAM_CHUNK = "stream_chunk",
  SERVER_RESTART = "server_restart",
  ABNORMAL_CLOSURE = "abnormal_closure",
  TIMEOUT = "timeout",
  MESSAGE = "message",
  RECONNECT = "reconnect",
  CONNECTION_ERROR = "connection_error",
  CONNECTION_TIMEOUT_ERROR = "connection_timeout_error",
  MAX_CONNECTION_ATTEMPTS_EXCEEDED = "max_connection_attempts_exceeded",
  MAX_RECONNECTION_ATTEMPTS_EXCEEDED = "max_reconnection_attempts_exceeded",
  SESSION_INACTIVE = "session_inactive",
  SESSION_REFRESHED = "session_refreshed",
  SESSION_NOT_FOUND = "session_not_found",
  START_NEW_SESSION = "start_new_session",
  MANAGE_CONNECTION_STATUS = "manage_connection_status",
}

export enum MULTI_SELECT_ADDITIONAL_OPTION {
  NOTA = "none_of_the_above",
  AOTA = "all_of_the_above",
}
