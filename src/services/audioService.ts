/**
 * AudioService - MediaRecorder Implementation
 * Full MP3 audio recording with automatic 15-minute pause
 */

export interface AudioConfig {
  mimeType: string;
  audioBitsPerSecond: number;
  maxRecordingDuration: number; // in milliseconds (15 minutes = 900000ms)
  autoPauseEnabled: boolean;
}

export interface AudioData {
  audio: string; // Base64 encoded MP3 audio
  format: string; // MIME type (e.g., "audio/mp3")
  duration: number; // Recording duration in milliseconds
  timestamp: number; // Recording start timestamp
}

export type AudioDataCallback = (data: AudioData) => void;
export type ErrorCallback = (error: Error) => void;
export type StatusCallback = (
  status: "recording" | "paused" | "stopped"
) => void;

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private isInitialized = false;
  private isActive = false;
  private recordingStartTime: number = 0;
  private autoPauseTimer: NodeJS.Timeout | null = null;
  private audioChunks: Blob[] = [];

  // Configuration
  private config: AudioConfig;

  // Callbacks
  private audioDataCallback: AudioDataCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private statusCallback: StatusCallback | null = null;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = {
      mimeType: "audio/webm;codecs=opus", // Fallback to webm if mp3 not supported
      audioBitsPerSecond: 128000, // 128 kbps
      maxRecordingDuration: 900000, // 15 minutes in milliseconds
      autoPauseEnabled: true,
      ...config,
    };
  }

  /**
   * Initialize the service and check MediaRecorder support
   */
  async initialize(): Promise<void> {
    try {
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder is not supported in this browser");
      }

      // Check for supported audio formats in order of preference
      const supportedTypes = [
        "audio/mp3",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
      ].filter((type) => MediaRecorder.isTypeSupported(type));

      if (supportedTypes.length === 0) {
        throw new Error("No supported audio formats found in this browser");
      }

      // Update config with best supported mime type
      this.config.mimeType = supportedTypes[0];

      console.log("Supported audio formats:", supportedTypes);
      console.log("Selected format:", this.config.mimeType);

      console.log(
        `AudioService initialized with format: ${this.config.mimeType}`
      );
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Audio initialization failed: ${error}`);
    }
  }

  /**
   * Start recording audio
   */
  async start(
    onAudioData: AudioDataCallback,
    onError?: ErrorCallback,
    onStatus?: StatusCallback
  ): Promise<void> {
    if (!this.isInitialized) throw new Error("Not initialized");
    if (this.isActive) throw new Error("Already active");

    try {
      this.audioDataCallback = onAudioData;
      this.errorCallback = onError || null;
      this.statusCallback = onStatus || null;

      // Get user media
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1,
        },
      });

      // Create MediaRecorder with fallback if the selected format fails
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(this.mediaStream, {
          mimeType: this.config.mimeType,
          audioBitsPerSecond: this.config.audioBitsPerSecond,
        });
      } catch (error) {
        console.warn(
          `Failed to create MediaRecorder with ${this.config.mimeType}, trying without mimeType`
        );
        // Fallback: create MediaRecorder without specifying mimeType
        mediaRecorder = new MediaRecorder(this.mediaStream, {
          audioBitsPerSecond: this.config.audioBitsPerSecond,
        });
        // Update the config to reflect the actual format being used
        this.config.mimeType = mediaRecorder.mimeType;
        console.log("Fallback MIME type selected:", this.config.mimeType);
      }

      this.mediaRecorder = mediaRecorder;

      // Verify MediaRecorder is in a valid state
      if (this.mediaRecorder.state !== "inactive") {
        throw new Error(
          `MediaRecorder in invalid state: ${this.mediaRecorder.state}`
        );
      }

      // Set up event handlers
      this.setupMediaRecorderEvents();

      // Start recording
      this.mediaRecorder.start();
      this.isActive = true;
      this.recordingStartTime = Date.now();
      this.audioChunks = [];

      // Set up auto-pause timer if enabled
      if (this.config.autoPauseEnabled) {
        this.setupAutoPauseTimer();
      }

      this.statusCallback?.("recording");
      console.log("Audio recording started with MediaRecorder");
      console.log("Using MIME type:", this.config.mimeType);
      console.log("MediaRecorder state:", this.mediaRecorder.state);
    } catch (error) {
      console.error("Detailed error in start method:", error);
      throw new Error(`Failed to start: ${error}`);
    }
  }

  /**
   * Stop recording manually
   */
  stop(): void {
    if (!this.isActive || !this.mediaRecorder) return;

    try {
      // Clear auto-pause timer
      if (this.autoPauseTimer) {
        clearTimeout(this.autoPauseTimer);
        this.autoPauseTimer = null;
      }

      // Stop MediaRecorder
      if (this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      this.isActive = false;
      this.statusCallback?.("stopped");
      console.log("Audio recording stopped manually");
    } catch (error) {
      this.errorCallback?.(new Error(`Failed to stop: ${error}`));
    }
  }

  /**
   * Pause recording (for auto-pause functionality)
   */
  private pauseRecording(): void {
    if (!this.isActive || !this.mediaRecorder) return;

    try {
      if (this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
      }

      this.isActive = false;
      this.statusCallback?.("paused");
      console.log("Audio recording paused automatically after 15 minutes");
    } catch (error) {
      this.errorCallback?.(new Error(`Failed to pause recording: ${error}`));
    }
  }

  /**
   * Set up MediaRecorder event handlers
   */
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      try {
        if (this.audioChunks.length > 0) {
          // Create blob from audio chunks
          const audioBlob = new Blob(this.audioChunks, {
            type: this.config.mimeType,
          });

          // Convert to base64
          const base64Audio = await this.blobToBase64(audioBlob);

          // Calculate duration
          const duration = Date.now() - this.recordingStartTime;

          // Create audio data object
          const audioData: AudioData = {
            audio: base64Audio,
            format: this.config.mimeType,
            duration: duration,
            timestamp: this.recordingStartTime,
          };

          // Send to callback
          this.audioDataCallback?.(audioData);

          // Clear chunks
          this.audioChunks = [];
        }
      } catch (error) {
        console.error("Error processing recorded audio:", error);
        this.errorCallback?.(new Error(`Audio processing failed: ${error}`));
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error("MediaRecorder error:", event);
      this.errorCallback?.(new Error("MediaRecorder encountered an error"));
    };

    this.mediaRecorder.onstart = () => {
      console.log("MediaRecorder started recording");
      if (this.mediaRecorder) {
        console.log("MediaRecorder state:", this.mediaRecorder.state);
        console.log("MediaRecorder MIME type:", this.mediaRecorder.mimeType);
      }
    };
  }

  /**
   * Set up auto-pause timer for 15-minute limit
   */
  private setupAutoPauseTimer(): void {
    if (this.autoPauseTimer) {
      clearTimeout(this.autoPauseTimer);
    }

    this.autoPauseTimer = setTimeout(() => {
      console.log("Auto-pause timer triggered after 15 minutes");
      this.pauseRecording();
    }, this.config.maxRecordingDuration);
  }

  /**
   * Convert blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove data URL prefix (e.g., "data:audio/mp3;base64,")
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stop();

    try {
      if (this.mediaRecorder) {
        this.mediaRecorder = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      this.isInitialized = false;
      this.audioChunks = [];
      console.log("AudioService cleaned up");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Check if service is active
   */
  isServiceActive(): boolean {
    return this.isActive;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    if (!this.isActive) return 0;
    return Date.now() - this.recordingStartTime;
  }

  /**
   * Get remaining time before auto-pause
   */
  getRemainingTime(): number {
    if (!this.isActive || !this.config.autoPauseEnabled) return 0;
    const elapsed = Date.now() - this.recordingStartTime;
    return Math.max(0, this.config.maxRecordingDuration - elapsed);
  }
}
