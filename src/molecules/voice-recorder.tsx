import { useState, useRef, useEffect } from "react"
import { Mic, Square, Trash2 } from 'lucide-react'
import { Button } from "@ui/index"

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onCancel: () => void
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevels, setAudioLevels] = useState<number[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
        // Simulate audio levels for visualization
        setAudioLevels(prev => [...prev.slice(-20), Math.random() * 100])
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        onRecordingComplete(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      setAudioLevels([])
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    onCancel()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border-t">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-red-600"
        onClick={cancelRecording}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <div className="flex items-center gap-1 h-8">
          {audioLevels.slice(-15).map((level, index) => (
            <div
              key={index}
              className="w-1 bg-blue-500 rounded-full transition-all duration-100"
              style={{ height: `${Math.max(4, level * 0.3)}px` }}
            />
          ))}
        </div>
        <span className="text-sm font-mono text-gray-600">
          {formatTime(Math.floor(recordingTime / 10))}
        </span>
      </div>

      <Button
        variant={isRecording ? "destructive" : "default"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
    </div>
  )
}
