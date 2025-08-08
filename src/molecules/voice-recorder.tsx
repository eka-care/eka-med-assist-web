import { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Send } from "lucide-react";
import { Button } from "@ui/index";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioChunks, setAudioChunks] = useState<Float32Array[]>([]);
  const [showSendButton, setShowSendButton] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio context and worklet
  const initializeAudio = async () => {
    try {
      console.log("starting to initialize audio");

      // Check if audio is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording not supported in this browser");
      }

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      // Create source node
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      // Load and create worklet node
      await audioContext.audioWorklet.addModule("/audio-chunk-processor.js");
      const workletNode = new AudioWorkletNode(
        audioContext,
        "audio-chunk-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 0, // No output to prevent echo
          processorOptions: {
            chunkSize: 1024,
            sampleRate: audioContext.sampleRate,
            silenceThreshold: 0.01,
            silenceDuration: 0.5,
          },
        }
      );
      console.log("workletNode created successfully");

      workletNodeRef.current = workletNode;

      // Handle audio chunks from worklet
      workletNode.port.onmessage = (event) => {
        try {
          if (event.data.type === "chunk") {
            const { audioData, rms } = event.data;

            // Validate audio data and ensure it's Float32Array
            if (audioData && audioData instanceof Float32Array) {
              setAudioChunks((prev) => [...prev, audioData]);
              console.log(
                "Audio chunk received:",
                audioData.length,
                "samples, RMS:",
                rms
              );
            }
          }
        } catch (error) {
          console.error("Error processing audio chunk:", error);
        }
      };

      // Connect nodes
      sourceNode.connect(workletNode);

      return true;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setAudioChunks([]);
      setShowSendButton(false);
      setRecordingTime(0);

      const success = await initializeAudio();
      if (!success) return;

      setIsRecording(true);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 100);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRecording(false);
    setShowSendButton(true);

    // Cleanup audio nodes
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      console.log("worklet node disconnected ");
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      console.log("source node disconnected ");
      sourceNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Send recording
  const sendRecording = () => {
    if (audioChunks.length === 0) return;

    try {
      console.log("Sending recording with", audioChunks.length, "chunks");
      console.log(
        "Total samples:",
        audioChunks.reduce((total, chunk) => total + chunk.length, 0)
      );

      // Create a simple blob for now (you can process this further)
      const totalSamples = audioChunks.reduce(
        (total, chunk) => total + chunk.length,
        0
      );
      const audioBuffer = new Float32Array(totalSamples);

      let offset = 0;
      for (const chunk of audioChunks) {
        if (chunk && chunk instanceof Float32Array) {
          audioBuffer.set(chunk, offset);
          offset += chunk.length;
        }
      }

      // Convert to blob (simplified)
      const blob = new Blob([audioBuffer], { type: "audio/raw" });
      onRecordingComplete(blob);

      // Reset state
      setAudioChunks([]);
      setShowSendButton(false);
    } catch (error) {
      console.error("Error sending recording:", error);
      // Fallback: create empty blob
      const emptyBlob = new Blob([], { type: "audio/raw" });
      onRecordingComplete(emptyBlob);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    stopRecording();
    setAudioChunks([]);
    setShowSendButton(false);
    onCancel();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border-t">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-red-600"
        onClick={cancelRecording}>
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm font-mono text-gray-600">
          {formatTime(Math.floor(recordingTime / 10))}
        </span>

        {/* {isRecording && (
          <span className="text-xs text-gray-500">
            Chunks: {audioChunks.length}
          </span>
        )} */}
      </div>

      {showSendButton ? (
        <Button
          variant="default"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={sendRecording}>
          <Send className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
