import { useState, useEffect, useCallback, useRef } from 'react';

// iOS 13+ extends DeviceMotionEvent with a requestPermission static method
interface DeviceMotionEventIOS extends DeviceMotionEvent {
  requestPermission?: never;
}
interface DeviceMotionEventIOSConstructor {
  new (type: string, eventInitDict?: DeviceMotionEventInit): DeviceMotionEventIOS;
  prototype: DeviceMotionEventIOS;
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

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

// Check if device is likely mobile/tablet with accelerometer
function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check for touch capability as a primary indicator
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check user agent for mobile devices
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Must have both touch AND mobile user agent to be considered mobile
  // This filters out desktop Safari which has DeviceMotionEvent but no accelerometer
  return hasTouch && mobileUA;
}

export function useShakeDetection(
  options: ShakeDetectionOptions = {}
): ShakeDetectionResult {
  const {
    threshold = SHAKE_THRESHOLD,
    debounceMs = DEBOUNCE_MS,
    onShake,
  } = options;

  // Compute support and initial permission state once (avoids setState in effect)
  const [isSupported] = useState(() => {
    return typeof window !== 'undefined' &&
      'DeviceMotionEvent' in window &&
      isMobileDevice();
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(() => {
    if (!isSupported) return null;
    const DME = DeviceMotionEvent as unknown as DeviceMotionEventIOSConstructor;
    if (typeof DME.requestPermission === 'function') {
      // iOS 13+: permission state unknown until requested
      return null;
    }
    // Non-iOS: permission not required
    return true;
  });

  const [lastShakeIntensity, setLastShakeIntensity] = useState(0);

  const lastShakeTime = useRef(0);
  const samples = useRef<number[]>([]);
  const onShakeRef = useRef(onShake);
  useEffect(() => {
    onShakeRef.current = onShake;
  });

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
      const DME = DeviceMotionEvent as unknown as DeviceMotionEventIOSConstructor;
      if (typeof DME.requestPermission === 'function') {
        const response = await DME.requestPermission();
        const granted = response === 'granted';
        setHasPermission(granted);
        return granted;
      } else {
        // Non-iOS, no permission needed
        setHasPermission(true);
        return true;
      }
    } catch {
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
