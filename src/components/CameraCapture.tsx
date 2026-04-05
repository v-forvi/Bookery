"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        // Fallback: camera not available, user should use file input
        onCancel();
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageData);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera View */}
      <div className="relative flex-1 overflow-hidden">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-safe">
        <div className="flex items-center justify-around">
          {/* Cancel / Retake */}
          <button
            onClick={capturedImage ? handleRetake : onCancel}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            {capturedImage ? (
              <RotateCw className="h-6 w-6" />
            ) : (
              <X className="h-6 w-6" />
            )}
          </button>

          {/* Capture / Confirm */}
          <button
            onClick={capturedImage ? handleConfirm : handleCapture}
            className={`w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform ${
              capturedImage
                ? "bg-green-500 text-white"
                : "bg-white border-4 border-white/30"
            }`}
          >
            {capturedImage ? (
              <Check className="h-8 w-8" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white" />
            )}
          </button>

          {/* Flip Camera (only show when not captured) */}
          {!capturedImage && (
            <button
              onClick={handleFlipCamera}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <RotateCw className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Safe area padding for iOS */}
      <style jsx>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
}

interface CameraCaptureButtonProps {
  onCapture: (imageData: string) => void;
  disabled?: boolean;
}

export function CameraCaptureButton({ onCapture, disabled }: CameraCaptureButtonProps) {
  const [showCamera, setShowCamera] = useState(false);

  const handleCapture = (imageData: string) => {
    setShowCamera(false);
    onCapture(imageData);
  };

  const handleClick = () => {
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Camera not available, could fall back to file input here
      alert("Camera not available. Please use the file upload option.");
      return;
    }
    setShowCamera(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled}
        className="w-full"
      >
        <Camera className="h-5 w-5 mr-2" />
        Open Camera
      </Button>

      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
