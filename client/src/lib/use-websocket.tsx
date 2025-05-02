import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

interface WebSocketMessage {
  type: string;
  payload: any;
}

type SendMessageFunction = (type: string, payload: any) => void;

export function useWebSocket(): {
  sendMessage: SendMessageFunction;
  lastMessage: WebSocketMessage | null;
  connected: boolean;
} {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
// Use the configured API_URL from config.ts
    import { API_URL } from "../config";
    
    let wsUrl: string;
    
    if (API_URL) {
      // If API_URL is set, use it to build the WebSocket URL
      const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
      const apiUrlWithoutProtocol = API_URL.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}://${apiUrlWithoutProtocol}/ws`;
    } else {
      // Fallback to same origin if API_URL is not set
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }
    
    console.log('Connecting to WebSocket at:', wsUrl);
   
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      
      // Send authentication message to associate this WebSocket with the user
      socket.send(JSON.stringify({
        type: 'auth',
        payload: { userId: user.id }
      }));
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, payload };
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  return { sendMessage, lastMessage, connected };
}
