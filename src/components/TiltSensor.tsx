import { useEffect } from 'react';

// Reads device orientation (gyroscope) and writes normalized tilt values
// (-1..1 on each axis) to CSS custom properties on the document root:
// --tilt-x (left-right) and --tilt-y (front-back). Components use these
// to drive specular highlights on glass surfaces.
//
// iOS 13+ requires DeviceOrientationEvent.requestPermission() inside a
// user gesture — we attach to the first tap.
export default function TiltSensor() {
  useEffect(() => {
    let raf = 0;
    let gx = 0;
    let gy = 0;

    function flush() {
      document.documentElement.style.setProperty('--tilt-x', gx.toFixed(3));
      document.documentElement.style.setProperty('--tilt-y', gy.toFixed(3));
      raf = 0;
    }

    function handleOrientation(e: DeviceOrientationEvent) {
      const gamma = e.gamma ?? 0; // -90..90, +right-side-down
      const beta = e.beta ?? 0;   // -180..180, +top-side-down (phone leaning back)
      // sensitivity 35° = full deflection; assume phone held ~25° toward user
      gx = Math.max(-1, Math.min(1, gamma / 35));
      gy = Math.max(-1, Math.min(1, (beta - 25) / 35));
      if (!raf) raf = requestAnimationFrame(flush);
    }

    function attach() {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> } }).DeviceOrientationEvent;
    const needsPermission = DOE && typeof DOE.requestPermission === 'function';

    let cleanupGesture: (() => void) | null = null;

    if (!needsPermission) {
      attach();
    } else {
      const requestOnce = async () => {
        cleanupGesture?.();
        cleanupGesture = null;
        try {
          const result = await DOE!.requestPermission!();
          if (result === 'granted') attach();
        } catch {
          // ignore — user denied or browser blocked
        }
      };
      document.addEventListener('touchend', requestOnce, { once: true, passive: true });
      document.addEventListener('click', requestOnce, { once: true });
      cleanupGesture = () => {
        document.removeEventListener('touchend', requestOnce);
        document.removeEventListener('click', requestOnce);
      };
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      cleanupGesture?.();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
