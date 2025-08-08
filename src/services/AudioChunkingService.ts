/**
 * Simplified AudioChunkingService
 *
 * Core Features:
 * - Audio chunking with configurable chunk size
 * - Silence detection
 * - Audio buffering for upload
 * - Basic audio analysis
 */

export interface AudioChunkConfig {
  chunkSize: number; // Samples per chunk (default: 100)
  sampleRate: number; // Audio sample rate (default: 44100)
  silenceThreshold: number; // Silence detection threshold (default: 0.01)
  silenceDuration: number; // Silence duration in seconds (default: 0.5)
}

export interface AudioChunk {
  audioData: Float32Array;
  rms: number;
  isSilent: boolean;
  timestamp: number;
  sampleRate: number;
}

export type AudioChunkCallback = (chunk: AudioChunk) => void;
export type ErrorCallback = (error: Error) => void;

export class AudioChunkingService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isInitialized = false;
  private isRecording = false;

  // Configuration
  private config: AudioChunkConfig;

  // Callbacks
  private chunkCallback: AudioChunkCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  // Audio buffer for upload
  private audioBuffer: Float32Array[] = [];
  private maxBufferSize = 1000; // Maximum chunks to keep in memory

  constructor(config: Partial<AudioChunkConfig> = {}) {
    this.config = {
      chunkSize: 100,
      sampleRate: 44100,
      silenceThreshold: 0.01,
      silenceDuration: 0.5,
      ...config,
    };
  }

  /**
   * Initialize the audio context and worklet
   */
  async initialize(): Promise<void> {
    try {
      // Create AudioContext
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: "interactive",
      });

      // Load the audio worklet
      await this.audioContext.audioWorklet.addModule(
        "/audio-chunk-processor.js"
      );

      // Create the worklet node
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "audio-chunk-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
          channelCountMode: "explicit",
          channelInterpretation: "discrete",
        }
      );

      // Set up message handling - this binds the handleWorkletMessage method to this instance
      this.workletNode.port.onmessage = this.handleWorkletMessage.bind(this);

      // Connect the worklet node
      this.workletNode.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log("AudioChunkingService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize AudioChunkingService:", error);
      throw new Error(
        `Audio initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Start recording and chunking audio
   */
  async startRecording(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        "AudioChunkingService not initialized. Call initialize() first."
      );
    }

    if (this.isRecording) {
      throw new Error("Recording already in progress");
    }

    try {
      // Get user media
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // We handle this ourselves
          sampleRate: this.config.sampleRate,
          channelCount: 1,
        },
      });

      // Create source node
      this.sourceNode = this.audioContext!.createMediaStreamSource(
        this.mediaStream
      );

      // Connect source to worklet
      this.sourceNode.connect(this.workletNode!);

      // Configure the worklet
      this.workletNode!.port.postMessage({
        type: "configure",
        data: this.config,
      });

      // Clear previous buffer
      this.audioBuffer = [];

      this.isRecording = true;
      console.log("Audio recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw new Error(
        `Recording failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.isRecording) return;

    try {
      // Stop the media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      // Disconnect nodes
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      // Reset worklet
      if (this.workletNode) {
        this.workletNode.port.postMessage({ type: "reset" });
      }

      this.isRecording = false;
      console.log("Audio recording stopped");
    } catch (error) {
      console.error("Error stopping recording:", error);
      this.errorCallback?.(
        new Error(
          `Failed to stop recording: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stopRecording();

    try {
      if (this.workletNode) {
        this.workletNode.disconnect();
        this.workletNode = null;
      }

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.isInitialized = false;
      this.audioBuffer = [];
      console.log("AudioChunkingService cleaned up");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Get all buffered audio data for upload
   */
  getBufferedAudio(): Float32Array[] {
    return [...this.audioBuffer];
  }

  /**
   * Clear the audio buffer
   */
  clearBuffer(): void {
    this.audioBuffer = [];
  }

  /**
   * Set callbacks
   */
  onChunk(callback: AudioChunkCallback): void {
    this.chunkCallback = callback;
  }

  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Check if recording is active
   */
  isRecordingActive(): boolean {
    return this.isRecording;
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
  getConfig(): AudioChunkConfig {
    return { ...this.config };
  }

  /**
   * Handle messages from the audio worklet
   * This method is bound to the worklet's onmessage event
   */
  private handleWorkletMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case "chunk":
        this.handleAudioChunk(data);
        break;

      case "error":
        this.errorCallback?.(new Error(data.message));
        break;
    }
  }

  /**
   * Process incoming audio chunks
   */
  private handleAudioChunk(chunkData: any): void {
    try {
      const chunk: AudioChunk = {
        audioData: new Float32Array(chunkData.audioData),
        rms: chunkData.rms,
        isSilent: chunkData.isSilent,
        timestamp: chunkData.timestamp,
        sampleRate: chunkData.sampleRate,
      };

      // Add to buffer for upload
      this.audioBuffer.push(chunk.audioData);

      // Limit buffer size to prevent memory issues
      if (this.audioBuffer.length > this.maxBufferSize) {
        this.audioBuffer.shift(); // Remove oldest chunk
      }

      // Call the chunk callback
      this.chunkCallback?.(chunk);
    } catch (error) {
      console.error("Error processing audio chunk:", error);
      this.errorCallback?.(
        new Error(
          `Chunk processing failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
    }
  }
}
