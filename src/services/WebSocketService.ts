import { config } from "@/configs/constants";
import {
  WEBSOCKET_CUSTOM_EVENTS,
  WEBSOCKET_SERVER_EVENTS,
} from "@/configs/enums";
import type {
  AudioEndOfStreamRequest,
  AudioStreamRequest,
  AuthRequest,
  ChatMessage,
  ChatRequest,
  ChatResponseMessage,
  ClientMessage,
  ConnectionEstablishedMessage,
  ConnectionStateType,
  EndOfStreamMessage,
  ErrorMessage,
  PingRequest,
  PongMessage,
  ServerMessage,
  StreamResponseMessage,
  SyncMessage,
  WebSocketConfig,
} from "../types/socket";
import {
  ConnectionState,
  ContentType,
  ERROR_MESSAGES,
  SOCKET_ERROR_CODES,
  SocketEvent,
} from "../types/socket";
import type { AudioData } from "./audioService";
import {
  zipFiles,
  shouldZipFiles,
  getUploadFileName,
  blobToFile,
} from "@/utils/fileUtils";
import { getSessionDetails } from "@/api/get-session-details";

type TimeoutHandle = ReturnType<typeof setTimeout>;
const BASE_URL = `${config.WEBSOCKET_URL}/ws/med-assist/session`;
export class WebSocketService {
  private ws: WebSocket | null = null;
  public config: WebSocketConfig;
  private connectionState: ConnectionStateType = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private maxReconnectAttempts: number = 2;
  private connectionAttempts: number = 0;
  private reconnectDelay: number = 1000;
  private eventCallbacks: Map<string, Set<Function>> = new Map();
  private isReconnecting: boolean = false;
  private pingInterval: TimeoutHandle | null = null;
  private connectionTimeout: TimeoutHandle | null = null;
  private currentStreamMessage: ChatMessage | null = null;
  private pendingFiles: File[] = [];
  private pendingMessage: string | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      sessionId: config.sessionId,
      auth: config.auth,
      options: {
        connectAttempts: 5,
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        pingInterval: 30000, // 30 seconds
        connectionTimeout: 5000,
        ...config.options,
      },
    };
    //TODO change config to connection attempts
    this.maxReconnectAttempts = this.config.options?.reconnectAttempts || 5;
    this.maxConnectionAttempts = this.config.options?.connectAttempts || 5;
    this.reconnectDelay = this.config.options?.reconnectDelay || 1000;
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    try {
      // Prevent multiple simultaneous connection attempts
      if (
        this.isReconnecting ||
        this.connectionState === ConnectionState.CONNECTING
      ) {
        console.log(
          "Connection already in progress, skipping from connect function"
        );
        return;
      }

      if (this.isConnected()) {
        console.log("WebSocket is already connected");
        return;
      }

      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.log("connection attempts exceeded", this.connectionAttempts);
        this.updateConnectionState(ConnectionState.ERROR);
        this.triggerEvent(
          WEBSOCKET_CUSTOM_EVENTS.MAX_CONNECTION_ATTEMPTS_EXCEEDED,
          new Error("connection attempts exceeded")
        );
        return;
      }

      this.updateConnectionState(ConnectionState.CONNECTING);
      this.isReconnecting = true;
      if (this.connectionAttempts == 2) {
        await this.checkSessionDetails();
      }
      this.connectionAttempts++;

      // Connect to WebSocket with session ID in URL and token as query param
      const wsUrl = `${BASE_URL}/${this.config.sessionId}/`;

      console.log(
        "Connecting to WebSocket:",
        wsUrl,
        "with session ID:",
        this.config.sessionId
      );

      this.ws = new WebSocket(wsUrl);

      // Set up WebSocket event handlers
      this.setupWebSocketHandlers();

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === ConnectionState.CONNECTING) {
          console.log(
            "Connection timeout",
            this.reconnectAttempts,
            this.maxReconnectAttempts
          );
          this.isReconnecting = false;
          this.updateConnectionState(ConnectionState.ERROR);
          //when connection timeout came after two retries, throw reconnect error andtell user to start a new session
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.triggerEvent(
              WEBSOCKET_CUSTOM_EVENTS.MAX_RECONNECTION_ATTEMPTS_EXCEEDED,
              new Error("Connection timeout after two retries")
            );
            return;
          }
          this.cleanup();

          this.triggerEvent(
            WEBSOCKET_CUSTOM_EVENTS.CONNECTION_TIMEOUT_ERROR,
            new Error("Connection timeout")
          );
        }
      }, this.config.options?.connectionTimeout || 5000);

      // Error handler will be set up in setupWebSocketHandlers()
      if (!this.ws) {
        throw new Error("WebSocket not initialized");
      }
    } catch (error) {
      console.error("Failed to connect:", error);
      this.isReconnecting = false;
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(
        WEBSOCKET_CUSTOM_EVENTS.CONNECTION_ERROR,
        error instanceof Error ? error : new Error("Connection failed")
      );
      throw error;
    }
  }

  private async checkSessionDetails(): Promise<void> {
    try {
      this.isReconnecting = false;
      //call api to get session details
      const sessionDetails = await getSessionDetails(this.config.sessionId);
      console.log("sessionDetails response", sessionDetails);
      if (sessionDetails) {
        this.isReconnecting = true;
        //if active continue reconnecting
      } else {
        this.isReconnecting = false;
        this.updateConnectionState(ConnectionState.ERROR);
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED,
          false
        );
        this.triggerEvent(
          WEBSOCKET_CUSTOM_EVENTS.SESSION_INACTIVE,
          new Error(ERROR_MESSAGES.SESSION_INACTIVE.title)
        );
        // Trigger event to start a new session
        this.triggerEvent(
          WEBSOCKET_CUSTOM_EVENTS.START_NEW_SESSION,
          new Error("Session is invalid, starting new session")
        );
        this.cleanup();
        return;
      }
    } catch (error) {
      //if api call fails, continue reconnecting
      console.error("Error checking session details:", error);
      this.isReconnecting = true;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket opened");
      this.sendAuthMessage();
      this.isReconnecting = false;
      this.connectionAttempts = 0;
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.startPingInterval();
    };

    this.ws.onmessage = async (event) => {
      try {
        const data: ServerMessage = JSON.parse(event.data);
        await this.handleServerMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event);
      this.handleConnectionClose(event);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.isReconnecting = false;
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(
        WEBSOCKET_SERVER_EVENTS.ERROR,
        new Error("WebSocket error occurred")
      );
    };
  }

  /**
   * Handle server messages
   */
  private async handleServerMessage(message: ServerMessage): Promise<void> {
    switch (message.ev) {
      case WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED:
        this.handleConnectionEstablished(
          message as ConnectionEstablishedMessage
        );
        break;

      case WEBSOCKET_SERVER_EVENTS.CHAT:
        this.handleChatMessage(message as ChatResponseMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.STREAM:
        this.handleStreamMessage(message as StreamResponseMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.END_OF_STREAM:
        this.handleEndOfStreamMessage(message as EndOfStreamMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.PONG:
        this.handlePongMessage(message as PongMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.SYNC:
        this.handleSyncMessage(message as SyncMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.ERROR:
        await this.handleErrorMessage(message as ErrorMessage);
        break;

      default:
        console.warn("Unknown event type:", message.ev);
    }
  }

  /**
   * Handle connection established message
   */
  private handleConnectionEstablished(
    _: ConnectionEstablishedMessage
  ): void {
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, true);
  }

  /**
   * Handle chat message
   */
  private handleChatMessage(message: ChatResponseMessage): void {
    console.log("Chat message received:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CHAT, message);
  }

  /**
   * Handle stream message
   */
  private handleStreamMessage(message: StreamResponseMessage): void {
    if (message.ct === ContentType.TEXT && message.data) {
      // Handle progress messages
      if (message.data.progress_msg) {
        this.triggerEvent("progress_message", message.data.progress_msg);
        return;
      }

      // Handle text messages
      if (message.data.text) {
        // Create or update streaming message
        if (!this.currentStreamMessage) {
          this.currentStreamMessage = {
            id: Date.now(),
            content: "",
            timestamp: new Date(),
            type: "text",
            metadata: { isStreaming: true },
          };
        }

        // Add the new word/chunk to the existing content
        this.currentStreamMessage.content += message.data.text;
        // Send the PROGRESSIVE (accumulated) text, not just the new word
        this.triggerEvent("stream_chunk", this.currentStreamMessage.content);
      }
    } else if (message.ct === ContentType.TIPS) {
      console.log("Tips message received:", message.data);
      if (message.data.tips?.length) {
        this.triggerEvent(WEBSOCKET_CUSTOM_EVENTS.TIPS, message.data.tips);
      }
    } else {
      // For non-text streams, just pass through
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.STREAM, message);
    }
  }

  /**
   * Handle end of stream message
   */
  private handleEndOfStreamMessage(message: EndOfStreamMessage): void {
    if (message.ct === ContentType.TEXT && this.currentStreamMessage) {
      // Finalize the streaming message
      this.currentStreamMessage.metadata = {
        ...this.currentStreamMessage.metadata,
        isStreaming: false,
      };
      this.triggerEvent(
        WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
        this.currentStreamMessage
      );
      // Clear the streaming message
      this.currentStreamMessage = null;
    } else {
      // For non-text end of streams, just pass through
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.END_OF_STREAM, message);
    }
  }

  /**
   * Handle pong message
   */
  private handlePongMessage(message: PongMessage): void {
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.PONG, message);
  }

  /**
   * Handle sync message
   */
  private handleSyncMessage(message: SyncMessage): void {
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.SYNC, message);
  }

  /**
   * Handle error message
   */
  private async handleErrorMessage(message: ErrorMessage): Promise<void> {
    switch (message.code) {
      case SOCKET_ERROR_CODES.TIMEOUT:
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
      case SOCKET_ERROR_CODES.SESSION_INACTIVE:
        // Try to refresh the session when it becomes inactive
        // console.log("Session inactive, attempting to refresh...");
        // const refreshSuccess = await this.attemptSessionRefresh();
        // if (refreshSuccess) {
        //   console.log(
        //     "Session refreshed successfully, triggering reconnection"
        //   );
        //   this.triggerEvent(WEBSOCKET_CUSTOM_EVENTS.SESSION_REFRESHED, true);
        //   // Attempt to reconnect with the refreshed session
        //   setTimeout(() => {
        //     this.reconnect(false, "session refreshed");
        //   }, 1000);
        // } else {
        //   console.log(
        //     "Failed to refresh session, triggering session inactive event"
        //   );
        //   this.triggerEvent(
        //     WEBSOCKET_CUSTOM_EVENTS.SESSION_INACTIVE,
        //     new Error(message.msg)
        //   );
        // }
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
      case SOCKET_ERROR_CODES.SESSION_EXPIRED:
        // Try to refresh the session when it expires
        console.log("Session expired from service");
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
        // const refreshExpiredSuccess = await this.attemptSessionRefresh();
        // if (refreshExpiredSuccess) {
        //   console.log(
        //     "Expired session refreshed successfully, triggering reconnection"
        //   );
        //   this.triggerEvent(WEBSOCKET_CUSTOM_EVENTS.SESSION_REFRESHED, true);
        //   // Attempt to reconnect with the refreshed session
        //   setTimeout(() => {
        //     this.reconnect(false, "expired session refreshed");
        //   }, 1000);
        // } else {
        //   console.log(
        //     "Failed to refresh expired session, triggering session expired event"
        //   );
        //   this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        // }
      case SOCKET_ERROR_CODES.INVALID_EVENT:
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
      case SOCKET_ERROR_CODES.INVALID_CONTENT_TYPE:
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
      case SOCKET_ERROR_CODES.PARSING_ERROR:
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
      case SOCKET_ERROR_CODES.FILE_UPLOAD_INPROGRESS:
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
      case SOCKET_ERROR_CODES.SERVER_ERROR:
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
        break;
      default:
        console.error("Unknown error code:", message.code);
        this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, message);
    }
  }

  /**
   * Handle connection close, usually this error comes
   */
  private handleConnectionClose(event: CloseEvent): void {
    this.cleanup();
    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, false);

    // Attempt to reconnect if not manually closed
    if (event.code !== 1000 && !this.isReconnecting && event.code ! == 1008) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect --- internal reconnect function with delay
   */
  private attemptReconnect(): void {
    if (this.isReconnecting) {
      console.log(
        "Reconnection already in progress, skipping from attemptReconnect function"
      );
      return;
    }

    console.log(
      `Attempting to reconnect (${this.connectionAttempts + 1}/${
        this.maxConnectionAttempts
      })`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error(
          "Reconnection failed from attemptReconnect function:",
          error
        );
      });
    }, this.reconnectDelay);
  }

  /**
   * Send chat message
   */
  public sendChatMessage({message, tool_use_id, hidden}: {message: string, tool_use_id?: string, hidden?: boolean}): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket not connected");
    }

    const chatMessage: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.TEXT,
      ts: Date.now(),
      _id: Date.now().toString(),
      data: { text: message, ...(tool_use_id && { tool_use_id }), ...(hidden && { hidden }) },
    };

    this.sendMessage(chatMessage);
  }

  /**
   * Send a file upload request
   */
  public sendFileUploadRequest(): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.FILE,
      ts: Date.now(),
      _id: Date.now().toString(),
    };

    this.sendMessage(message);
  }

  private sendAuthMessage(): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }
    const message: AuthRequest = {
      ev: SocketEvent.AUTH,
      _id: Date.now().toString(),
      ts: Date.now(),
      data: { token: this.config.auth.token },
    };
    this.sendMessage(message);
  }
  /**
   * Send file upload completion with S3 URL
   */
  public sendFileUploadComplete(s3Url: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const text = this.pendingMessage;
    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.FILE,
      ts: Date.now(),
      _id: Date.now().toString(),
      data: {
        url: s3Url,
        ...(text && text.trim() && { text: text.trim() }),
      },
    };

    this.sendMessage(message);
    this.clearPendingFiles();
  }

  /**
   * Set files for upload when presigned URL is received
   */
  public setFilesForUpload(files: File[], message?: string): void {
    this.pendingFiles = files;
    if (message?.trim()) {
      this.pendingMessage = message;
    }

    console.log(`Set ${files.length} files for upload`);
  }

  /**
   * Clear pending files
   */
  public clearPendingFiles(): void {
    this.pendingFiles = [];
    this.pendingMessage = "";
    console.log("Cleared pending files");
  }

  /**
   * Clear streaming state
   */
  public clearStreamingState(): void {
    this.currentStreamMessage = null;
    console.log("Cleared streaming state");
  }
  //reconnect function specific for external retry

  public async reconnect(
    resetAttempts: boolean,
    reason?: string
  ): Promise<void> {
    if (!resetAttempts && this.isReconnecting) {
      console.log("Reconnection already in progress, skipping");
      return;
    }
    if (resetAttempts) {
      this.isReconnecting = false;
      this.connectionAttempts = 0;
    }

    if (this.reconnectAttempts === this.maxReconnectAttempts) {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(
        WEBSOCKET_CUSTOM_EVENTS.MAX_RECONNECTION_ATTEMPTS_EXCEEDED,
        new Error("Maximum reconnection attempts exceeded")
      );
      return;
    }
    this.reconnectAttempts++;
    console.log(
      `Initiating reconnection${reason ? ` due to: ${reason}` : ""}...`
    );

    this.updateConnectionState(ConnectionState.RECONNECTING);

    try {
      // Close existing connection if any

      this.disconnect();

      // Attempt to reconnect
      await this.connect();

      // // Trigger reconnection success event
      // this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, true);
    } catch (error) {
      console.error("Reconnection failed:", error);

      // Handle reconnection error
      this.handleReconnectionError(error as Error);
    } finally {
      this.isReconnecting = false;
    }
  }

  private handleReconnectionError(error: Error): void {
    this.reconnectAttempts++;
    this.isReconnecting = false;

    console.error("Reconnection error:", error);
    this.triggerEvent(WEBSOCKET_CUSTOM_EVENTS.CONNECTION_ERROR, error);

    if (this.reconnectAttempts === this.maxReconnectAttempts) {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(
        WEBSOCKET_CUSTOM_EVENTS.MAX_RECONNECTION_ATTEMPTS_EXCEEDED,
        new Error("Maximum reconnection attempts exceeded")
      );
    } else {
      // Schedule next reconnection attempt
      this.attemptReconnect();
    }
  }

  // private attemptReconnection(): void {
  //   if (this.reconnectAttempts >= this.maxReconnectAttempts) {
  //     this.updateConnectionState(ConnectionState.ERROR);
  //     this.triggerEvent(
  //       WEBSOCKET_SERVER_EVENTS.ERROR,
  //       new Error("Reconnect failed")
  //     );
  //     return;
  //   }

  //   // Prevent multiple simultaneous reconnection attempts
  //   if (this.isReconnecting) {
  //     console.log("Reconnection already in progress, skipping from attemptReconnection function");
  //     return;
  //   }

  //   const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
  //   console.log(
  //     `Scheduling reconnection attempt ${
  //       this.reconnectAttempts + 1
  //     } in ${delay}ms`
  //   );

  //   setTimeout(() => {
  //     if (!this.isConnected() && !this.isReconnecting) {
  //       console.log(
  //         `Attempting reconnection ${this.reconnectAttempts + 1}/${
  //           this.maxReconnectAttempts
  //         }`
  //       );
  //       // Use the unified reconnect function
  //       this.reconnect(`automatic attempt ${this.reconnectAttempts + 1}`);
  //     }
  //   }, delay);
  // }

  /**
   * Regenerate response for a specific chat
   */
  public regenerateResponse(originalUserMessage: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    console.log("Regenerating response for:", originalUserMessage);

    // Clear any existing streaming message when regenerating
    this.clearStreamingState();

    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.TEXT,
      ts: Date.now(),
      _id: Date.now().toString(),
      data: { text: originalUserMessage },
    };

    this.sendMessage(message);
  }

  /**
   * Upload files to presigned URL
   */
  public async uploadFilesToPresignedUrl(presignedUrl: string): Promise<void> {
    console.log("hi from uploadFilesToPresignedUrl");

    try {
      console.log(
        `Uploading ${this.pendingFiles.length} files to presigned URL ${presignedUrl}`
      );

      let fileToUpload: File;
      let contentType: string;

      if (shouldZipFiles(this.pendingFiles)) {
        // Zip multiple files into a single file
        console.log("Multiple files detected, zipping before upload...");
        const zipBlob = await zipFiles(this.pendingFiles);
        const zipFileName = getUploadFileName(this.pendingFiles);
        fileToUpload = blobToFile(zipBlob, zipFileName);
        contentType = "application/zip";

        console.log(
          `Zipped ${this.pendingFiles.length} files into ${zipFileName} (${(
            fileToUpload.size /
            1024 /
            1024
          ).toFixed(2)} MB)`
        );
      } else {
        // Single file, upload as is
        fileToUpload = this.pendingFiles[0];
        contentType = fileToUpload.type;
        console.log(
          `Uploading single file: ${fileToUpload.name} (${(
            fileToUpload.size /
            1024 /
            1024
          ).toFixed(2)} MB)`
        );
      }

      // Upload the file (either zipped or single)
      const response = await fetch(presignedUrl, {
        method: "PUT",
        body: fileToUpload,
        headers: {
          "Content-Type": contentType,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to upload ${fileToUpload.name}: ${response.status} ${response.statusText}`
        );
      }

      console.log(`Successfully uploaded ${fileToUpload.name}`, response);
      console.log(
        "File upload completed successfully, calling sendFileUploadComplete"
      );

      // Call sendFileUploadComplete with the presigned URL
      this.sendFileUploadComplete(presignedUrl);
    } catch (error) {
      console.error("Error uploading files to presigned URL:", error);
      throw error;
    }
  }

  /**
   * Send audio stream start
   */
  public sendAudioStreamStart(): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }
    const message: AudioStreamRequest = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      _id: Date.now().toString(),
      data: { audio: "start", format: "audio/mp4" },
    };
    this.sendMessage(message);
  }

  /**
   * Send full audio data (AudioService format) - CHANGED FROM ORIGINAL
   */
  public sendAudioStream(audioData: AudioData): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: AudioStreamRequest = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      _id: Date.now().toString(),
      data: {
        audio: audioData.audio, // Base64 encoded audio
        format: audioData.format, // MIME type
      },
    };

    console.log("Sending full audio data:", message);
    this.sendMessage(message);
  }

  /**
   * Send full audio data to backend (AudioService format) - NEW METHOD
   */
  public sendAudioData(audioData: AudioData): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket not connected");
    }

    const message: AudioStreamRequest = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      _id: Date.now().toString(),
      data: {
        audio: audioData.audio, // Base64 encoded audio
        format: audioData.format, // MIME type
      },
    };

    console.log("Sending full audio data to backend:", message);
    this.sendMessage(message);
  }

  /**
   * Send audio end of stream - CHANGED FROM ORIGINAL
   */
  public sendAudioEndOfStream(): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }
    console.log("Sending audio end of stream");
    const message: AudioEndOfStreamRequest = {
      ev: SocketEvent.END_OF_STREAM,
      ct: ContentType.AUDIO,
      _id: Date.now().toString(),
      ts: Date.now(),
    };

    this.sendMessage(message);
  }

  // /**
  //  * Send pill message
  //  */
  // public sendPillMessage(pillMessage: string, tool_use_id: string): void {
  //   if (!this.isConnected()) {
  //     throw new Error("WebSocket is not connected");
  //   }
  //   const message: ChatRequest = {
  //     ev: SocketEvent.CHAT,
  //     ct: ContentType.TEXT,
  //     ts: Date.now(),
  //     _id: Date.now().toString(),
  //     data: { text: pillMessage, tool_use_id: tool_use_id },
  //   };
  //   this.sendMessage(message);
  // }

  // /**
  //  * Send doctor card message
  //  */
  // public sendDoctorCardMessage(
  //   doctorCardMessage: string,
  //   tool_use_id: string
  // ): void {
  //   if (!this.isConnected()) {
  //     throw new Error("WebSocket is not connected");
  //   }
  //   const message: ChatRequest = {
  //     ev: SocketEvent.CHAT,
  //     ct: ContentType.DOCTOR_CARD,
  //     ts: Date.now(),
  //     _id: Date.now().toString(),
  //     data: { text: doctorCardMessage, tool_use_id: tool_use_id },
  //   };
  //   this.sendMessage(message);
  // }
  /**
   * Send ping message
   */
  public sendPing(): void {
    if (this.isConnected()) {
      const message: PingRequest = {
        ev: SocketEvent.PING,
        ts: Date.now(),
        _id: Date.now().toString(),
      };
      this.sendMessage(message);
    }
  }

  /**
   * Subscribe to events
   */
  public on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  public off(event: string, callback?: Function): void {
    if (callback) {
      this.eventCallbacks.get(event)?.delete(callback);
    } else {
      this.eventCallbacks.delete(event);
    }
  }

  /**
   * Trigger event
   */
  private triggerEvent(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in event callback:", error);
        }
      });
    }
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.options?.pingInterval || 30000);
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionStateType {
    return this.connectionState;
  }

  /**
   * Update WebSocket configuration
   */
  public updateConfig(newConfig: Partial<WebSocketConfig>): void {
    if (newConfig?.sessionId) {
      this.config.sessionId = newConfig.sessionId;
    }
    if (newConfig?.auth?.token) {
      this.config.auth.token = newConfig.auth.token;
    }
    console.log("WebSocket config updated:", this.config);
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: ConnectionStateType): void {
    this.connectionState = state;
    console.log("Connection state updated:", state);
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    console.log("WebSocket disconnect called");

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.cleanup();
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(
    message: ClientMessage | { ev: string; ts: number }
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error("WebSocket is not open");
    }
  }

  public getConfig(): WebSocketConfig {
    return this.config;
  }
  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws = null;
    }
  }
}
