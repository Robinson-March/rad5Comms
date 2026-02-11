import { createContext, useContext } from 'react';
import type { Socket } from 'socket.io-client';

export interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: string[];
}

export const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
});

export const useWebSocket = () => useContext(WebSocketContext);
