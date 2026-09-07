"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, MapPin, RefreshCw, X, Upload } from "lucide-react";
import { getCurrentPosition } from "@/lib/gps";
import { reverseGeocode } from "@/lib/geo";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  value?: string | null;
  onClear?: () => void;
  disabled?: boolean;
}

export default function CameraCapture({ onCapture, value, onClear, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(value ?? null);
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API unavailable in this browser");
      }

      if (navigator.permissions && typeof navigator.permissions.query === "function") {
        try {
          const permissionResult = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (permissionResult.state === "denied") {
            throw new Error("Camera permission denied. Please allow camera access in browser settings, or use the upload button below.");
          }
        } catch {
          // Permissions API not supported or camera permission not queryable;
          // fall through to direct getUserMedia attempt.
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      const message = err?.message ?? "Camera unavailable. Use the file upload fallback.";
      setError(message);
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || capturing) return;
    setCapturing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let currentGps: { latitude: number; longitude: number; accuracy: number } | null = null;
      let currentAddress: string | null = null;

      try {
        const pos = await getCurrentPosition();
        currentGps = {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
        };
        setGps(currentGps);
        setGeoLoading(true);
        try {
          const geo = await reverseGeocode(pos.latitude, pos.longitude);
          currentAddress = geo.displayName;
          setAddress(currentAddress);
        } catch {
          currentAddress = `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`;
          setAddress(currentAddress);
        } finally {
          setGeoLoading(false);
        }
      } catch (gpsErr) {
        console.warn("[CameraCapture] GPS capture failed", gpsErr);
      }

      const pad = 16;
      const lineHeight = 22;
      const boxPadding = 14;
      const maxWidth = canvas.width - (pad * 2);

      const timestamp = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const lines: string[] = [];
      if (currentAddress) {
        const wrapped = wrapText(ctx, currentAddress, maxWidth);
        lines.push(...wrapped);
      }
      if (currentGps) {
        lines.push(`GPS: ${currentGps.latitude.toFixed(6)}, ${currentGps.longitude.toFixed(6)}  (±${Math.round(currentGps.accuracy)}m)`);
      }
      lines.push(timestamp);

      const boxHeight = lines.length * lineHeight + boxPadding * 2;
      const boxY = canvas.height - boxHeight - pad;

      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.beginPath();
      ctx.roundRect(pad, boxY, maxWidth + boxPadding, boxHeight, 8);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px ui-sans-serif, system-ui, -apple-system, sans-serif";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillText(line, pad + boxPadding, boxY + boxPadding + i * lineHeight);
      });

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError("Failed to encode photo");
            setCapturing(false);
            return;
          }
          const file = new File([blob], `animal_${Date.now()}.jpg`, { type: "image/jpeg" });
          const dataUrl = URL.createObjectURL(blob);
          setCapturedDataUrl(dataUrl);
          stopCamera();
          onCapture(file);
          setCapturing(false);
        },
        "image/jpeg",
        0.92
      );
    } catch (err: any) {
      setError(err?.message ?? "Capture failed");
      setCapturing(false);
    }
  }, [capturing, onCapture, stopCamera]);

  const handleRetake = useCallback(() => {
    if (capturedDataUrl) {
      URL.revokeObjectURL(capturedDataUrl);
    }
    setCapturedDataUrl(null);
    setGps(null);
    setAddress(null);
    setError(null);
    startCamera();
  }, [capturedDataUrl, startCamera]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (fileInputRef.current) fileInputRef.current.value = "";

      setError(null);
      let currentGps: { latitude: number; longitude: number; accuracy: number } | null = null;
      let currentAddress: string | null = null;

      try {
        const pos = await getCurrentPosition();
        currentGps = {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
        };
        setGps(currentGps);
        setGeoLoading(true);
        try {
          const geo = await reverseGeocode(pos.latitude, pos.longitude);
          currentAddress = geo.displayName;
          setAddress(currentAddress);
        } catch {
          currentAddress = `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`;
          setAddress(currentAddress);
        } finally {
          setGeoLoading(false);
        }
      } catch (gpsErr) {
        console.warn("[CameraCapture] GPS fallback failed", gpsErr);
      }

      if (currentGps || currentAddress) {
        const bitmap = await createImageBitmap(file);
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0);

            const pad = Math.max(16, Math.floor(bitmap.width * 0.025));
            const lineHeight = Math.max(22, Math.floor(bitmap.height * 0.04));
            const boxPadding = Math.max(14, Math.floor(bitmap.width * 0.02));
            const maxWidth = bitmap.width - (pad * 2);

            const timestamp = new Date().toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            });

            const lines: string[] = [];
            if (currentAddress) {
              const wrapped = wrapText(ctx, currentAddress, maxWidth);
              lines.push(...wrapped);
            }
            if (currentGps) {
              lines.push(
                `GPS: ${currentGps.latitude.toFixed(6)}, ${currentGps.longitude.toFixed(6)}  (±${Math.round(currentGps.accuracy)}m)`
              );
            }
            lines.push(timestamp);

            const boxHeight = lines.length * lineHeight + boxPadding * 2;
            const boxY = bitmap.height - boxHeight - pad;

            ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
            ctx.beginPath();
            ctx.roundRect(pad, boxY, maxWidth + boxPadding, boxHeight, 8);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.max(14, Math.floor(bitmap.width * 0.018))}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
            ctx.textBaseline = "top";
            lines.forEach((line, i) => {
              ctx.fillText(line, pad + boxPadding, boxY + boxPadding + i * lineHeight);
            });

            canvas.toBlob(
              (blob) => {
                if (!blob) return;
                const stamped = new File([blob], file.name, { type: file.type });
                onCapture(stamped);
              },
              file.type.startsWith("image/png") ? "image/png" : "image/jpeg",
              0.92
            );
            bitmap.close();
            return;
          }
          bitmap.close();
        }
      }

      onCapture(file);
    },
    [onCapture]
  );

  useEffect(() => {
    if (!value && !capturedDataUrl && !disabled) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [disabled, startCamera, stopCamera, value, capturedDataUrl]);

  useEffect(() => {
    if (value && !capturedDataUrl) {
      setCapturedDataUrl(value);
    }
  }, [value, capturedDataUrl]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-on-surface">Photo with location</span>
        {capturedDataUrl && onClear && (
          <button
            type="button"
            onClick={() => {
              if (capturedDataUrl) URL.revokeObjectURL(capturedDataUrl);
              setCapturedDataUrl(null);
              setGps(null);
              setAddress(null);
              setError(null);
              onClear();
              startCamera();
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-error hover:underline"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container p-3 rounded-md text-xs font-medium">
          {error}
        </div>
      )}

      {!capturedDataUrl && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: cameraActive ? "block" : "none" }}
          />
          {!cameraActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant gap-3 p-6 text-center">
              <Camera className="w-10 h-10 opacity-60" />
              <p className="text-sm font-medium">Starting camera...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant gap-3 p-6 text-center">
              <Camera className="w-10 h-10 opacity-60" />
              <p className="text-sm font-medium">{error}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-sm font-bold hover:bg-surface-container transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload from device
              </button>
            </div>
          )}
        </div>
      )}

      {capturedDataUrl && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <img src={capturedDataUrl} alt="Captured" className="w-full h-full object-contain" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-sm font-bold hover:bg-surface-container transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retake
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!capturedDataUrl && cameraActive && (
          <button
            type="button"
            onClick={capturePhoto}
            disabled={capturing || disabled}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold disabled:opacity-60"
          >
            <Camera className="w-4 h-4" />
            {capturing ? "Capturing..." : geoLoading ? "Getting location..." : "Capture"}
          </button>
        )}

        {!capturedDataUrl && !cameraActive && !error && (
          <button
            type="button"
            onClick={startCamera}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-high text-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-60"
          >
            <Camera className="w-4 h-4" /> Start Camera
          </button>
        )}

        {!capturedDataUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-high text-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-60"
          >
            <Upload className="w-4 h-4" /> Upload from device
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {gps && (
        <div className="flex items-start gap-2 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-md">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <div className="space-y-0.5">
            <p className="font-semibold text-on-surface">
              {address ?? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`}
            </p>
            <p className="font-mono opacity-80">
              {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)} · ±{Math.round(gps.accuracy)}m
            </p>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}