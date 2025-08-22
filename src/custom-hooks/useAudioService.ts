/**
 * AudioService Hook - Full MP3 audio recording with auto-pause
 */

import { AudioService, type AudioData } from "@/services/audioService";
import { useState, useRef, useCallback, useEffect } from "react";

export interface UseAudioServiceReturn {
  isRecording: boolean;
  error: Error | null;
  recordingDuration: number;
  remainingTime: number;
  start: (onAudioData: (audioData: AudioData) => void) => Promise<void>;
  stop: () => void;
  clearError: () => void;
  getCurrentDuration: () => number;
  getRemainingTime: () => number;
}

export function useAudioService() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);

  const serviceRef = useRef<AudioService | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update duration and remaining time every second while recording
  const startDurationTracking = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    durationIntervalRef.current = setInterval(() => {
      if (serviceRef.current && isRecording) {
        const currentDuration = serviceRef.current.getCurrentDuration();
        const remaining = serviceRef.current.getRemainingTime();
        setRecordingDuration(currentDuration);
        setRemainingTime(remaining);
      }
    }, 1000);
  }, [isRecording]);

  const stopDurationTracking = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (onAudioData: (audioData: AudioData) => void) => {
      try {
        // Check if service exists and is initialized, if not, reinitialize
        if (
          !serviceRef.current ||
          !serviceRef.current.getInitializationStatus()
        ) {
          console.log(
            "AudioService not initialized or missing, reinitializing..."
          );
          if (serviceRef.current) {
            serviceRef.current.cleanup();
          }
          const service = new AudioService({
            maxRecordingDuration: 900000, // 15 minutes
            autoPauseEnabled: true,
            audioBitsPerSecond: 128000, // 128 kbps
          });
          await service.initialize();
          console.log("AudioService reinitialized in useAudioService");
          serviceRef.current = service;
        }

        setError(null);
        setRecordingDuration(0);
        setRemainingTime(serviceRef.current.getConfig().maxRecordingDuration);

        // Start recording with callbacks
        await serviceRef.current.start(
          // Audio data callback - receives full audio when recording stops
          (audioData) => {
            console.log("Received full audio data:", audioData);
            onAudioData(audioData);
            setIsRecording(false);
            stopDurationTracking();
          },
          // Error callback
          (err) => {
            console.error("Audio error in useAudioService:", err);
            setError(err);
            setIsRecording(false);
            stopDurationTracking();
          },
          // Status callback
          (status) => {
            console.log("Audio status changed:", status);
            if (status === "recording") {
              setIsRecording(true);
              startDurationTracking();
            } else if (status === "paused" || status === "stopped") {
              setIsRecording(false);
              stopDurationTracking();
            }
          }
        );
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to start recording");
        setError(error);
        setIsRecording(false);
        stopDurationTracking();
      }
    },
    [startDurationTracking, stopDurationTracking]
  );

  // Add reinitialize function
  const reinitialize = useCallback(async () => {
    try {
      console.log("Reinitializing AudioService...");
      if (serviceRef.current) {
        serviceRef.current.cleanup();
      }
      const service = new AudioService({
        maxRecordingDuration: 900000, // 15 minutes
        autoPauseEnabled: true,
        audioBitsPerSecond: 128000, // 128 kbps
      });
      await service.initialize();
      console.log("AudioService reinitialized successfully");
      serviceRef.current = service;
      setError(null);
      return true;
    } catch (error) {
      console.error("Failed to reinitialize AudioService:", error);
      setError(
        error instanceof Error ? error : new Error("Reinitialization failed")
      );
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stop();
      setIsRecording(false);
      stopDurationTracking();
    }
  }, [stopDurationTracking]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getCurrentDuration = useCallback(() => {
    return serviceRef.current?.getCurrentDuration() || 0;
  }, []);

  const getRemainingTime = useCallback(() => {
    return serviceRef.current?.getRemainingTime() || 0;
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    stopDurationTracking();
    if (serviceRef.current) {
      serviceRef.current.cleanup();
    }
  }, [stopDurationTracking]);

  // Cleanup effect
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isRecording,
    error,
    recordingDuration,
    remainingTime,
    start,
    stop,
    clearError,
    getCurrentDuration,
    getRemainingTime,
    reinitialize, // Export reinitialize function
  };
}
