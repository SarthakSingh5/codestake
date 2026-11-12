import { useState, useEffect } from 'react';

export function formatTimeRemaining(expiresAt: string | number | null | undefined, style: 'digital' | 'verbose' = 'digital') {
  if (!expiresAt) {
    return { formatted: style === 'verbose' ? 'No time limit' : '--:--', isExpired: false, totalSeconds: 0 };
  }

  const targetMs = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  if (isNaN(targetMs)) {
    return { formatted: style === 'verbose' ? 'Invalid date' : '--:--', isExpired: false, totalSeconds: 0 };
  }

  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) {
    return { formatted: style === 'verbose' ? 'Expired' : '00:00', isExpired: true, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (style === 'verbose') {
    if (hours > 0) {
      return { formatted: `${hours}h ${minutes}m left`, isExpired: false, totalSeconds };
    }
    return { formatted: `${minutes}m ${pad(seconds)}s left`, isExpired: false, totalSeconds };
  }

  // Digital style: HH:MM:SS if >= 1 hour, else MM:SS
  if (hours > 0) {
    return { formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`, isExpired: false, totalSeconds };
  }
  return { formatted: `${pad(minutes)}:${pad(seconds)}`, isExpired: false, totalSeconds };
}

export function useLiveTimer(expiresAt: string | number | null | undefined, style: 'digital' | 'verbose' = 'digital') {
  const [time, setTime] = useState(() => formatTimeRemaining(expiresAt, style));

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      setTime(formatTimeRemaining(expiresAt, style));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, style]);

  return time;
}

