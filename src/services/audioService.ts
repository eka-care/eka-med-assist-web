/**
 * Clean AudioService - Only captures audio and streams it
 */

export interface AudioConfig {
  chunkSize: number;
  sampleRate: number;
  silenceThreshold: number;
  silenceDuration: number;
}

export type AudioChunkCallback = (chunk: Uint8Array) => void;
export type ErrorCallback = (error: Error) => void;

export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isInitialized = false;
  private isActive = false;

  private config: AudioConfig;
  private chunkCallback: AudioChunkCallback | null = null;
  private errorCallback: ErrorCallback | null = null;

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = {
      chunkSize: 256,
      sampleRate: 16000,
      silenceThreshold: 0.01,
      silenceDuration: 0.3,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: "interactive",
      });

      await this.audioContext.audioWorklet.addModule(
        "/audio-chunk-processor.js"
      );

      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        "audio-chunk-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 0,
          channelCount: 1,
          processorOptions: this.config,
        }
      );

      this.workletNode.port.onmessage = this.handleWorkletMessage.bind(this);
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Audio initialization failed: ${error}`);
    }
  }

  async start(
    onChunk: AudioChunkCallback,
    onError?: ErrorCallback
  ): Promise<void> {
    if (!this.isInitialized) throw new Error("Not initialized");
    if (this.isActive) throw new Error("Already active");

    try {
      this.chunkCallback = onChunk;
      this.errorCallback = onError || null;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: this.config.sampleRate,
          channelCount: 1,
        },
      });

      this.sourceNode = this.audioContext!.createMediaStreamSource(
        this.mediaStream
      );
      this.sourceNode.connect(this.workletNode!);

      this.workletNode!.port.postMessage({
        type: "configure",
        data: this.config,
      });
      this.isActive = true;
    } catch (error) {
      throw new Error(`Failed to start: ${error}`);
    }
  }

  stop(): void {
    if (!this.isActive) return;

    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      if (this.workletNode) {
        this.workletNode.port.postMessage({ type: "reset" });
      }

      this.isActive = false;
      this.chunkCallback = null;
    } catch (error) {
      this.errorCallback?.(new Error(`Failed to stop: ${error}`));
    }
  }

  async cleanup(): Promise<void> {
    this.stop();

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
  }

  isServiceActive(): boolean {
    return this.isActive;
  }

  private handleWorkletMessage(event: MessageEvent): void {
    const { type, ...chunkData } = event.data;

    if (type === "chunk" && this.chunkCallback) {
      try {
        console.log("Received chunk in audio service", event);

        const audioData = this.convertToUint8Array(chunkData.audioData);
        this.chunkCallback(audioData);
        console.log("Sent chunk to callback in audio service");
      } catch (error) {
        this.errorCallback?.(new Error(`Chunk processing failed: ${error}`));
      }
    } else if (type === "error") {
      this.errorCallback?.(new Error(chunkData.message));
    }
  }

  private convertToUint8Array(audioData: Float32Array): Uint8Array {
    const int16Array = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      int16Array[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32767));
    }
    const res = new Uint8Array(int16Array.buffer);
    console.log("Converted to uint8Array", res);

    return res;
  }

  //   const uint8Array = new Uint8Array(audioData.length * 4);
  //   const buffer = new ArrayBuffer(audioData.length * 4);
  //   const view = new DataView(buffer);

  //   for (let i = 0; i < audioData.length; i++) {
  //     view.setFloat32(i * 4, audioData[i], true);
  //   }

  //   uint8Array.set(new Uint8Array(buffer));
  //   return uint8Array;
}
