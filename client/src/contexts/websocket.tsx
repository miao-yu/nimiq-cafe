import type { ReactNode } from 'react';

import React, { useState, useEffect, useContext, createContext } from 'react';

// Define the type for the context data
type WebSocketData = any; // Replace `any` with the specific type if you know the data structure
type WebSocketContextType = WebSocketData | null;

// Create the WebSocket context with a default null value
const WebSocketContext = createContext<WebSocketContextType>(null);

// Define the props for the provider
interface WebSocketProviderProps {
  children: ReactNode;
}

// WebSocketProvider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [data, setData] = useState<WebSocketData>(null);

  useEffect(() => {
    const ws = new WebSocket('wss://v2-dev.nimiq.cafe/ws/');
    ws.onmessage = (event) => setData(JSON.parse(event.data));
    return () => ws.close();
  }, []);

  return <WebSocketContext.Provider value={data}>{children}</WebSocketContext.Provider>;
};

// Hook to use the WebSocket context
export const useWebSocketData = (): WebSocketContextType => useContext(WebSocketContext);
