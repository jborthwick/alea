import { useState, useEffect, useCallback, useRef } from 'react';

interface ShakeDetectionOptions {
  threshold?: number;
  debounceMs?: number;
  onShake?: (intensity: number) => void;
}

interface ShakeDetectionResult {
  isSupported: boolean;
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;
  lastShakeIntensity: number;
}

const SHAKE_THRESHOLD = 20; // Acceleration threshold to detect shake
const DEBOUNCE_MS = 500; // Minimum time between shake detections
const SAMPLE_COUNT = 5; // Number of samples to average

export function useShakeDetection(
  options: ShakeDetectionOptions = {}
): ShakeDetectionResult {
  const {
    threshold = SHAKE_THRESHOLD,
    debounceMs = DEBOUNCE_MS,
    onShake,
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastShakeIntensity, setLastShakeIntensity] = useState(0);

  const lastShakeTime = useRef(0);
  const samples = useRef<number[]>([]);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  // Check if DeviceMotion is supported
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
    setIsSupported(supported);

    // Check if permission is already granted (non-iOS or already permitted)
    if (supported) {
      // iOS 13+ requires permission request
      if (
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        // Permission state unknown until requested
        setHasPermission(null);
      } else {
        // Non-iOS, permission not required
        setHasPermission(true);
      }
    }
  }, []);

  // Handle motion events
  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      if (x === null || y === null || z === null) return;

      // Calculate magnitude
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Add to samples
      samples.current.push(magnitude);
      if (samples.current.length > SAMPLE_COUNT) {
        samples.current.shift();
      }

      // Check if we have enough samples and they indicate a shake
      if (samples.current.length >= SAMPLE_COUNT) {
        const avgMagnitude =
          samples.current.reduce((a, b) => a + b, 0) / samples.current.length;

        // Detect shake: average magnitude above threshold
        const now = Date.now();
        if (avgMagnitude > threshold && now - lastShakeTime.current > debounceMs) {
          lastShakeTime.current = now;
          const intensity = Math.min(1, (avgMagnitude - 9.8) / 30);
          setLastShakeIntensity(intensity);

          if (onShakeRef.current) {
            onShakeRef.current(intensity);
          }

          // Clear samples after shake detected
          samples.current = [];
        }
      }
    },
    [threshold, debounceMs]
  );

  // Start/stop listening based on permission
  useEffect(() => {
    if (!isSupported || hasPermission !== true) return;

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isSupported, hasPermission, handleMotion]);

  // Request permission (needed for iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      // Check if permission API exists (iOS 13+)
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const response = await (DeviceMotionEvent as any).requestPermission();
        const granted = response === 'granted';
        setHasPermission(granted);
        return granted;
      } else {
        // Non-iOS, no permission needed
        setHasPermission(true);
        return true;
      }
    } catch (error) {
      console.error('Error requesting motion permission:', error);
      setHasPermission(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    hasPermission,
    requestPermission,
    lastShakeIntensity,
  };
}
