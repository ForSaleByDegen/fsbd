'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button } from './ui/button'

interface CameraCaptureProps {
  /** Full data URL (e.g. data:image/jpeg;base64,...) */
  onCapture: (dataUrl: string) => void
  onCancel: () => void
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      if (e?.name === 'NotAllowedError' || e?.message?.includes('dismissed')) {
        setError('Camera permission was denied. Enable camera access in your browser settings.')
      } else {
        setError('Could not access camera. Make sure no other app is using it.')
      }
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [startCamera])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg')
      setCapturedImage(dataUrl)
      stream?.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleConfirm = () => {
    if (capturedImage) onCapture(capturedImage)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCancel}
        className="absolute top-6 right-6 p-2 bg-neutral-800 text-white rounded-full hover:bg-neutral-700 z-50"
      >
        <X size={24} />
      </Button>

      <div className="relative w-full max-w-md aspect-[3/4] bg-neutral-900 rounded-2xl overflow-hidden border border-cyan-500/30 flex items-center justify-center">
        {error ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={32} />
            </div>
            <p className="text-neutral-300 text-sm">{error}</p>
            <div className="flex flex-col gap-3">
              <Button onClick={startCamera} className="w-full border-cyan-500 text-cyan-400 hover:bg-cyan-500/20">
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full border-neutral-600 text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : !capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {stream && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="w-16 h-16 rounded-full bg-white border-4 border-cyan-500/50 flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-500" />
                </button>
              </div>
            )}
          </>
        ) : (
          <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {capturedImage && (
        <div className="mt-8 flex gap-4 w-full max-w-md">
          <Button
            type="button"
            variant="outline"
            onClick={handleRetake}
            className="flex-1 border-neutral-600 text-neutral-300 hover:bg-neutral-800"
          >
            <RefreshCw size={20} className="mr-2" />
            Retake
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
          >
            <CheckCircle size={20} className="mr-2" />
            Use Photo
          </Button>
        </div>
      )}
    </div>
  )
}
