// import { useState, useRef, useMemo, useEffect } from "react";
// import { Mic, Send, Plus, Trash2, Check } from "lucide-react";
// import { Button, Input, voiceListeningGif } from "@ui/index";
// import { useAudioChunking } from "@/custom-hooks/useAudioChunking";

// interface MessageInputProps {
//   onSendMessage: (message: string) => void;
//   onVoiceMessage: (audioBlob: Blob) => void;
//   onFileUpload: (files: FileList) => void;
//   onInputChange?: (value: string) => void;
//   onInputFocus?: () => void;
//   onInputBlur?: () => void;
//   placeholder?: string;
//   disabled?: boolean;
//   isStreaming?: boolean;
// }

// export function MessageInput({
//   onSendMessage,
//   onVoiceMessage,
//   onFileUpload,
//   onInputChange,
//   onInputFocus,
//   onInputBlur,
//   placeholder = "Message Apollo Assist...",
//   disabled = false,
//   isStreaming = false,
// }: MessageInputProps) {
//   const [message, setMessage] = useState("");
//   const [isListening, setIsListening] = useState(false);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [showSendButton, setShowSendButton] = useState(false);
//   const [showEndButton, setShowEndButton] = useState(false);
//   const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   // Use the existing audio chunking hook
//   const {
//     isRecording,
//     error: audioError,
//     startRecording: startAudioRecording,
//     stopRecording: stopAudioRecording,
//     getBufferedAudio,
//     clearBuffer,
//   } = useAudioChunking({
//     onChunk: (chunk) => {
//       // Handle audio chunks if needed
//       console.log("Audio chunk received:", chunk);
//     },
//     onError: (error) => {
//       console.error("Audio error:", error);
//     },
//   });

//   // Check if there's any content to send
//   const hasContent = useMemo(() => {
//     const audioChunks = getBufferedAudio();
//     return message.trim() || uploadedFiles.length > 0 || audioChunks.length > 0;
//   }, [message, uploadedFiles, getBufferedAudio]);

//   // Check if input should be disabled (either disabled prop or streaming)
//   const isInputDisabled = disabled || isStreaming;

//   // Start recording
//   const startRecording = async () => {
//     try {
//       setShowSendButton(false);
//       setShowEndButton(false);
//       setRecordingTime(0);

//       await startAudioRecording();

//       // Start timer
//       intervalRef.current = setInterval(() => {
//         setRecordingTime((prev) => prev + 1);
//       }, 100);
//     } catch (error) {
//       console.error("Error starting recording:", error);
//     }
//   };

//   // Stop recording
//   const stopRecording = () => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//     }

//     setShowEndButton(true);
//     stopAudioRecording();
//   };

//   // Cancel recording
//   const cancelRecording = () => {
//     stopAudioRecording();
//     clearBuffer();
//     setShowSendButton(false);
//     setShowEndButton(false);
//     setIsListening(false);
//   };

//   // Send recording
//   const sendRecording = () => {
//     const audioChunks = getBufferedAudio();
//     if (audioChunks.length === 0) return;

//     try {
//       console.log("Sending recording with", audioChunks.length, "chunks");
//       console.log(
//         "Total samples:",
//         audioChunks.reduce((total, chunk) => total + chunk.length, 0)
//       );

//       // Create a simple blob for now (you can process this further)
//       const totalSamples = audioChunks.reduce(
//         (total, chunk) => total + chunk.length,
//         0
//       );
//       const audioBuffer = new Float32Array(totalSamples);

//       let offset = 0;
//       for (const chunk of audioChunks) {
//         if (chunk && chunk instanceof Float32Array) {
//           audioBuffer.set(chunk, offset);
//           offset += chunk.length;
//         }
//       }

//       // Convert to blob (simplified)
//       const blob = new Blob([audioBuffer], { type: "audio/raw" });
//       onVoiceMessage(blob);

//       // Reset state
//       clearBuffer();
//       setShowSendButton(false);
//       setShowEndButton(false);
//       setIsListening(false);
//     } catch (error) {
//       console.error("Error sending recording:", error);
//       // Fallback: create empty blob
//       const emptyBlob = new Blob([], { type: "audio/raw" });
//       onVoiceMessage(emptyBlob);
//     }
//   };

//   const handleSend = () => {
//     if (
//       (message.trim() || uploadedFiles.length > 0 || getBufferedAudio().length > 0) &&
//       !disabled
//     ) {
//       // Send text message
//       if (message.trim()) {
//         onSendMessage(message.trim());
//       }

//       // Send files if any
//       if (uploadedFiles.length > 0) {
//         const fileList = new DataTransfer();
//         uploadedFiles.forEach((file) => fileList.items.add(file));
//         onFileUpload(fileList.files);
//       }

//       // Send audio if any
//       if (getBufferedAudio().length > 0) {
//         sendRecording();
//       }

//       setMessage("");
//       setUploadedFiles([]);
//       clearBuffer();
//       setShowSendButton(false);
//       setShowEndButton(false);
//       setIsListening(false);
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   const handleMicClick = () => {
//     if (!isListening && !isRecording) {
//       setIsListening(true);
//       startRecording();
//     } else if (isRecording) {
//       stopRecording();
//     }
//   };

//   const handleFileClick = () => {
//     fileInputRef.current?.click();
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       const files = Array.from(e.target.files);
//       setUploadedFiles((prev) => [...prev, ...files]);
//       e.target.value = ""; // Reset input
//     }
//   };

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, "0")}:${secs
//       .toString()
//       .padStart(2, "0")}`;
//   };

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }
//       // The useAudioChunking hook manages its own cleanup
//     };
//   }, []);

//   return (
//     <div className="flex items-center gap-2 px-4 py-1 bg-[var(--color-background)] rounded-full border border-[var(--color-primary)] mx-4">
//       <input
//         ref={fileInputRef}
//         type="file"
//         multiple
//         accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
//         onChange={handleFileChange}
//         className="hidden"
//       />

//       {isListening || isRecording ? (
//         <Button
//           variant="ghost"
//           size="sm"
//           className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 flex-shrink-0"
//           onClick={cancelRecording}>
//           <Trash2 className="h-4 w-4" />
//         </Button>
//       ) : (
//         <Button
//           variant="ghost"
//           size="sm"
//           className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
//           onClick={handleFileClick}
//           disabled={disabled}>
//           <Plus className="h-4 w-4 text-[var(--color-primary)]" />
//         </Button>
//       )}

//       <div className="flex-1 relative">
//         {isListening || isRecording || showEndButton ? (
//           <div className="flex items-center justify-center px-3 py-2">
//             {isRecording ? (
//               <div className="relative">
//                 <img
//                   src={voiceListeningGif}
//                   alt="Voice listening"
//                   className="h-6 w-56"
//                 />
//                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent pointer-events-none">
//                   <div className="absolute left-0 top-0 w-4 h-full bg-gradient-to-r from-white to-transparent"></div>
//                   <div className="absolute right-0 top-0 w-4 h-full bg-gradient-to-l from-white to-transparent"></div>
//                 </div>
//               </div>
//             ) : (
//               <span className="text-sm text-[var(--color-primary)]">
//                 {showEndButton ? "Recording Paused" : "Listning..."}
//               </span>
//             )}
//           </div>
//         ) : (
//           <div className="relative w-full">
//             {/* Streaming indicator */}
//             {isStreaming && (
//               <div className="absolute -top-6 left-0 right-0 flex items-center gap-2 text-xs text-blue-600">
//                 <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
//                 <span>Streaming response...</span>
//               </div>
//             )}
//             <Input
//               value={message}
//               onChange={(e) => {
//                 setMessage(e.target.value);
//                 onInputChange?.(e.target.value);
//               }}
//               onKeyPress={handleKeyPress}
//               onFocus={onInputFocus}
//               onBlur={onInputBlur}
//               placeholder={
//                 isStreaming ? "Please wait for response..." : placeholder
//               }
//               disabled={isInputDisabled}
//               className="border-0 shadow-none focus-visible:ring-0 text-sm"
//             />
//           </div>
//         )}

//         {/* File Preview */}
//         {uploadedFiles.length > 0 && (
//           <div className="absolute -top-8 left-0 right-0 flex flex-wrap gap-1">
//             {uploadedFiles.map((file, index) => (
//               <div
//                 key={index}
//                 className="flex items-center gap-1 bg-[var(--color-accent)] text-[var(--color-primary)] px-2 py-1 rounded-md text-xs max-w-32">
//                 <span className="truncate">{file.name}</span>
//                 <button
//                   onClick={() =>
//                     setUploadedFiles((prev) =>
//                       prev.filter((_, i) => i !== index)
//                     )
//                   }
//                   className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 ml-1">
//                   ×
//                 </button>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Timer */}
//       {(isListening || isRecording || showEndButton) && (
//         <span className="text-sm font-mono text-[var(--color-primary)]">
//           {formatTime(Math.floor(recordingTime / 10))}
//         </span>
//       )}

//       {/* Voice Recording Controls */}
//       {isListening || isRecording || showEndButton ? (
//         <div className="flex items-center gap-2">
//           {showEndButton ? (
//             <Button
//               size="sm"
//               className="h-8 w-8 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0 rounded-full"
//               onClick={handleSend}
//               disabled={isInputDisabled}>
//               <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
//             </Button>
//           ) : (
//             <Button
//               size="sm"
//               className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 flex-shrink-0 rounded-full"
//               onClick={handleMicClick}>
//               <Check className="h-4 w-4 text-white" />
//             </Button>
//           )}
//         </div>
//       ) : (
//         <>
//           <Button
//             variant="ghost"
//             size="sm"
//             className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
//             onClick={handleMicClick}
//             disabled={isInputDisabled}>
//             <Mic className="h-4 w-4 text-[var(--color-primary)]" />
//           </Button>

//           {hasContent && (
//             <Button
//               size="sm"
//               className="h-8 w-8 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0 rounded-full"
//               onClick={handleSend}
//               disabled={isInputDisabled}>
//               <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
//             </Button>
//           )}
//         </>
//       )}
//     </div>
//   );
// }
