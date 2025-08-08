/**
 * Simple Audio Chunk Processor
 *
 * Creates audio chunks from microphone input
 * No echo, no playback - just chunking
 */

class AudioChunkProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    // Configuration
    this.chunkSize = options.processorOptions?.chunkSize || 1024;
    this.sampleRate = options.processorOptions?.sampleRate || 44100;
    this.silenceThreshold = options.processorOptions?.silenceThreshold || 0.01;
    this.silenceDuration = options.processorOptions?.silenceDuration || 0.5;

    // Buffer for accumulating samples
    this.buffer = new Float32Array(this.chunkSize);
    this.bufferIndex = 0;
    this.frameCount = 0;
  }

  // Calculate RMS (Root Mean Square) for volume detection
  calculateRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const channel = input[0]; // Mono input

    if (!channel) return true;

    // Process each sample
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bufferIndex] = channel[i];
      this.bufferIndex++;

      // When buffer is full, send chunk
      if (this.bufferIndex >= this.chunkSize) {
        // Calculate RMS for this chunk
        const rms = this.calculateRMS(this.buffer);

        // Send audio chunk to main thread
        this.port.postMessage({
          type: "chunk",
          audioData: this.buffer.slice(), // Copy the buffer
          rms: rms,
          timestamp: (this.frameCount * this.chunkSize) / this.sampleRate,
          sampleRate: this.sampleRate,
        });

        // Reset buffer
        this.bufferIndex = 0;
        this.frameCount++;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor("audio-chunk-processor", AudioChunkProcessor);
