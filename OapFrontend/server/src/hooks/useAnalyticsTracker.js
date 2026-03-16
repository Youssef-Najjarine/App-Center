import { useRef, useCallback, useEffect } from "react";

const FLUSH_INTERVAL_MS = 5000;
const EVENT_IMPRESSION = 1;
const EVENT_CLICK = 2;

const useAnalyticsTracker = (currentUserId) => {
  const queueRef = useRef([]);
  const seenImpressionsRef = useRef(new Set());
  const flushTimerRef = useRef(null);

  const flush = useCallback(async () => {
    const batch = queueRef.current;
    if (batch.length === 0) return;
    queueRef.current = [];

    try {
      await fetch("/api/analytics/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
      });
    } catch {}
  }, []);

  useEffect(() => {
    flushTimerRef.current = setInterval(() => flush(), FLUSH_INTERVAL_MS);
    return () => {
      clearInterval(flushTimerRef.current);
      flush();
    };
  }, [flush]);

  useEffect(() => {
    const handleUnload = () => {
      const batch = queueRef.current;
      if (batch.length === 0) return;
      queueRef.current = [];
      try {
        navigator.sendBeacon(
          "/api/analytics/events",
          new Blob([JSON.stringify({ events: batch })], { type: "application/json" })
        );
      } catch { }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const trackImpression = useCallback((appId, ownerUserId) => {
    if (!appId) return;
    if (currentUserId && ownerUserId && currentUserId === ownerUserId) return;
    const key = String(appId);
    if (seenImpressionsRef.current.has(key)) return;
    seenImpressionsRef.current.add(key);

    queueRef.current.push({
      appId,
      eventType: EVENT_IMPRESSION,
      timestamp: new Date().toISOString(),
    });
  }, [currentUserId]);

  const trackClick = useCallback((appId, ownerUserId) => {
    if (!appId) return;
    if (currentUserId && ownerUserId && currentUserId === ownerUserId) return;

    queueRef.current.push({
      appId,
      eventType: EVENT_CLICK,
      timestamp: new Date().toISOString(),
    });
  }, [currentUserId]);

  return { trackImpression, trackClick };
};

export default useAnalyticsTracker;