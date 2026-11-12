"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getOrCreateDeviceId } from "./deviceId";

interface UsePresenceReturn {
  deviceId: string;
  isConnected: boolean;
  isLimitReached: boolean;
  limitMessage: string | null;
  activeDevicesCount: number;
  maxDevices: number;
  retry: () => void;
}

export function usePresence(isGuest: boolean): UsePresenceReturn {
  const [deviceId, setDeviceId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [activeDevicesCount, setActiveDevicesCount] = useState(1);
  const [maxDevices, setMaxDevices] = useState(isGuest ? 3 : 5);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const retry = useCallback(() => {
    setIsLimitReached(false);
    setLimitMessage(null);
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);

    // Guest presence is managed primarily by /ws/guest/{session_id}
    // Only connect /ws/presence for logged-in users who have a copysync_token
    if (isGuest) {
      setMaxDevices(3);
      return;
    }

    setMaxDevices(5);

    const api = process.env.NEXT_PROD_API_URL;
    const token = typeof window !== "undefined" ? localStorage.getItem("copysync_token") : null;

    if (!api || !token) return;

    const wsUrl =
      api.replace(/^http/, "ws") +
      `/ws/presence?token=${encodeURIComponent(token)}&device_id=${encodeURIComponent(id)}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;
    } catch {
      return;
    }

    socket.onopen = () => {
      setIsConnected(true);
      setIsLimitReached(false);
      setLimitMessage(null);

      // Start ping loop every 20 seconds
      pingTimerRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "presence.connected") {
          setActiveDevicesCount(data.active_devices || 1);
          setMaxDevices(data.max_devices || 5);
        }
      } catch {
        // Ignore unparseable frames
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }

      // Code 1008 is Policy Violation (Device limit reached)
      if (event.code === 1008 && event.reason?.includes("limit reached")) {
        setIsLimitReached(true);
        setLimitMessage(
          event.reason ||
            "Active account device limit reached (5 max). Please close CopySync on one of your active devices to connect."
        );
      }
    };

    socket.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (socket) {
        socket.close();
      }
      wsRef.current = null;
    };
  }, [isGuest, retryTrigger]);

  return {
    deviceId,
    isConnected,
    isLimitReached,
    limitMessage,
    activeDevicesCount,
    maxDevices,
    retry,
  };
}

