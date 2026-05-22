import { useState, useEffect, useCallback, useRef } from 'react';
import { CameraDevice, WebcamState } from '../types';

export const useWebcam = (selectedDeviceId: string | null) => {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [webcamState, setWebcamState] = useState<WebcamState>({
    stream: null,
    error: null,
    isLoading: true,
    permissionDenied: false,
  });
  
  // Keep track of the current stream to clean it up properly
  const streamRef = useRef<MediaStream | null>(null);

  // cleanup function to stop tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Fetch available video devices
  const fetchDevices = useCallback(async () => {
    try {
      // We need to request permission first to get labels
      // If we don't have a stream yet, this might trigger the permission prompt
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceInfos
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
        }));
      setDevices(videoDevices);
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  }, []);

  // Initialize stream
  useEffect(() => {
    let isMounted = true;

    const startStream = async () => {
      setWebcamState(prev => ({ ...prev, isLoading: true, error: null }));
      stopStream();

      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId } } 
            : true,
          audio: false, 
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        setWebcamState({
          stream,
          error: null,
          isLoading: false,
          permissionDenied: false,
        });

        // After successfully getting a stream, refresh device list to ensure we have labels
        fetchDevices();

      } catch (err: any) {
        if (!isMounted) return;
        
        console.error("Error accessing webcam:", err);
        let errorMsg = "Could not access camera.";
        let permissionDenied = false;

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = "Camera permission was denied. Please allow access in your browser settings.";
          permissionDenied = true;
        } else if (err.name === 'NotFoundError') {
          errorMsg = "No camera device found.";
        }

        setWebcamState({
          stream: null,
          error: errorMsg,
          isLoading: false,
          permissionDenied,
        });
      }
    };

    startStream();

    // Listen for device changes (plug/unplug)
    const handleDeviceChange = () => {
        fetchDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      isMounted = false;
      stopStream();
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [selectedDeviceId, stopStream, fetchDevices]);

  return { devices, ...webcamState };
};