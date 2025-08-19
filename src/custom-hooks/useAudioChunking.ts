/**
 * Clean Audio Hook - Simple interface to AudioService
 */

import { AudioService } from "@/services/audioService";
import { useState, useRef, useCallback } from "react";

export interface UseAudioChunkingReturn {
  isRecording: boolean;
  error: Error | null;
  start: (onChunk: (chunk: Uint8Array) => void) => Promise<void>;
  stop: () => void;
  clearError: () => void;
}

export function useAudioChunking() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const serviceRef = useRef<AudioService | null>(null);

  const start = useCallback(async (onChunk: (chunk: Uint8Array) => void) => {
    try {
      if (!serviceRef.current) {
        const service = new AudioService();
        await service.initialize();
        console.log("called on initialize in useAudioChunking");
        serviceRef.current = service;
      }

      setError(null);
      await serviceRef.current.start(onChunk, (err) => setError(err));
      setIsRecording(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to start");
      setError(error);
    }
  }, []);

  const stop = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { isRecording, error, start, stop, clearError };
}
// /**
//  * Simple Audio Chunking Hook
//  *
//  * Stable implementation without complex state management
//  */

// import { useState, useRef, useCallback } from "react";
// import { AudioChunkingService } from "../services/AudioChunkingService";
// import type {
//   AudioChunkConfig,
//   AudioChunk,
// } from "../services/AudioChunkingService";

// export interface UseAudioChunkingOptions {
//   config?: Partial<AudioChunkConfig>;
//   onChunk: (chunk: AudioChunk) => void;
//   onError?: (error: Error) => void;
// }

// export interface UseAudioChunkingReturn {
//   // Simple state
//   isRecording: boolean;
//   error: Error | null;

//   // Actions
//   initialize: () => Promise<void>;
//   startRecording: () => Promise<void>;
//   stopRecording: () => void;

//   // Buffer management
//   getBufferedAudio: () => Float32Array[];
//   clearBuffer: () => void;
// }

// export function useAudioChunking(
//   options: UseAudioChunkingOptions
// ): UseAudioChunkingReturn {
//   const { config = {}, onChunk, onError } = options;

//   // Simple state - no complex initialization tracking
//   const [isRecording, setIsRecording] = useState(false);
//   const [error, setError] = useState<Error | null>(null);

//   // Service reference
//   const serviceRef = useRef<AudioChunkingService | null>(null);

//   // Initialize - simple and stable
//   const initialize = useCallback(async () => {
//     if (serviceRef.current) return; // Already initialized

//     try {
//       const service = new AudioChunkingService(config);

//       // Set up callbacks
//       service.onChunk((chunk) => {
//         console.log("Hi from on chunk in useAudioChunking:", chunk);
//         onChunk?.(chunk);
//       });

//       service.onError((err) => {
//         console.log("Audio error received in useAudioChunking:", err);

//         setError(err);
//         onError?.(err);
//       });

//       await service.initialize();
//       serviceRef.current = service;
//     } catch (err) {
//       const error =
//         err instanceof Error
//           ? err
//           : new Error("Failed to initialize audio service");
//       setError(error);
//       onError?.(error);
//     }
//   }, [config, onChunk, onError]);

//   // Start recording
//   const startRecording = useCallback(async () => {
//     if (!serviceRef.current) {
//       await initialize();
//     }

//     try {
//       setError(null);
//       await serviceRef.current!.startRecording();
//       setIsRecording(true);
//     } catch (err) {
//       const error =
//         err instanceof Error ? err : new Error("Failed to start recording");
//       setError(error);
//       onError?.(error);
//     }
//   }, [initialize, onError]);

//   // Stop recording
//   const stopRecording = useCallback(() => {
//     if (serviceRef.current) {
//       serviceRef.current.stopRecording();
//       setIsRecording(false);
//     }
//   }, []);

//   // Get buffered audio
//   const getBufferedAudio = useCallback(() => {
//     return serviceRef.current?.getBufferedAudio() || [];
//   }, []);

//   // Clear buffer
//   const clearBuffer = useCallback(() => {
//     serviceRef.current?.clearBuffer();
//   }, []);

//   return {
//     isRecording,
//     error,
//     initialize,
//     startRecording,
//     stopRecording,
//     getBufferedAudio,
//     clearBuffer,
//   };
// }
