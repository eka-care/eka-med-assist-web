export enum WEBSOCKET_SERVER_EVENTS {
  PING = "ping",
  PONG = "pong",
  CONNECTION_ESTABLISHED = "conn",
  CHAT = "chat",
  STREAM = "stream",
  END_OF_STREAM = "eos",
  SYNC = "sync",
  ERROR = "err",
}

export enum WEBSOCKET_CUSTOM_EVENTS {
  PROGRESS_MESSAGE = "progress_message",
  STREAM_CHUNK = "stream_chunk",
  SERVER_RESTART = "server_restart",
  ABNORMAL_CLOSURE = "abnormal_closure",
  TIMEOUT = "timeout",
  MESSAGE = "message",
  RECONNECT = "reconnect",
}

export enum MULTI_SELECT_ADDITIONAL_OPTION {
  NOTA = "none_of_the_above",
  AOTA = "all_of_the_above",
}