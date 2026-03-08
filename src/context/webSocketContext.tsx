import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const WS_PATH = normalizeSocketPath(import.meta.env.VITE_SOCKET_PATH || '/ws');
const WS_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_WEBHOOK_URL) ||
  normalizeBaseUrl(import.meta.env.VITE_WS_BASE_URL) ||
  deriveSocketBaseUrl(API_BASE_URL) ||
  getBrowserOrigin();

function normalizeBaseUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\/+$/, '');
  return normalized || undefined;
}

function normalizeSocketPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/ws';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function deriveSocketBaseUrl(apiBaseUrl?: string): string | undefined {
  const normalized = normalizeBaseUrl(apiBaseUrl);
  if (!normalized) return undefined;
  return normalized.replace(/\/api$/i, '');
}

function getBrowserOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return normalizeBaseUrl(window.location.origin);
}

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

interface WebSocketProviderProps {
  children: ReactNode;
}

let globalSocket: Socket | null = null;
let globalSocketToken: string | null = null;
let isConnecting = false;

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const connectSocket = () => {
      const token = localStorage.getItem('token');

      if (isConnecting) return;

      if (globalSocket && globalSocketToken === token && globalSocket.connected) {
        console.log('[socket] Reusing existing connection', { id: globalSocket.id });
        if (mountedRef.current) {
          setSocketState(globalSocket);
          setIsConnected(true);
        }
        return;
      }

      if (globalSocket) {
        globalSocket.removeAllListeners();
        globalSocket.disconnect();
        globalSocket = null;
        globalSocketToken = null;
      }

      if (!token) {
        if (mountedRef.current) {
          setSocketState(null);
          setIsConnected(false);
          setOnlineUsers([]);
        }
        return;
      }

      if (!WS_BASE_URL) {
        console.error(
          '[socket] Missing base URL. Set VITE_API_WEBHOOK_URL or VITE_WS_BASE_URL, or make sure VITE_API_BASE_URL is defined.'
        );
        if (mountedRef.current) {
          setSocketState(null);
          setIsConnected(false);
        }
        return;
      }

      console.log('[socket] Connecting', {
        baseUrl: WS_BASE_URL,
        path: WS_PATH,
        hasToken: Boolean(token),
      });
      isConnecting = true;

      const newSocket = io(WS_BASE_URL, {
        path: WS_PATH,
        query: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      newSocket.on('connect', () => {
        console.log('[socket] Connected', {
          id: newSocket.id,
          transport: newSocket.io.engine?.transport?.name,
          baseUrl: WS_BASE_URL,
          path: WS_PATH,
        });
        isConnecting = false;
        if (mountedRef.current) {
          setIsConnected(true);
          setSocketState(newSocket);
        }
      });

      newSocket.onAny((eventName: string, ...args: unknown[]) => {
        console.log(`[socket event] ${eventName}:`, ...args);
      });

      newSocket.on(
        'connect_error',
        (err: Error & { description?: unknown; context?: unknown; data?: unknown }) => {
          console.error('[socket] Connection error', {
            message: err.message,
            description: err.description,
            data: err.data,
            context: err.context,
            baseUrl: WS_BASE_URL,
            path: WS_PATH,
            transport: newSocket.io.engine?.transport?.name,
          });
          isConnecting = false;
        }
      );

      newSocket.io.on('reconnect_attempt', (attempt) => {
        console.log('[socket] Reconnect attempt', {
          attempt,
          baseUrl: WS_BASE_URL,
          path: WS_PATH,
        });
      });

      newSocket.io.on('reconnect_error', (err) => {
        console.error('[socket] Reconnect error', err);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[socket] Disconnected', { reason });
        if (mountedRef.current) setIsConnected(false);
      });

      newSocket.on('online_users', (users: string[]) => {
        if (mountedRef.current) setOnlineUsers(users);
      });

      newSocket.on(
        'user_presence',
        ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
          if (!mountedRef.current) return;
          setOnlineUsers((prev) => {
            if (status === 'online' && !prev.includes(userId)) return [...prev, userId];
            if (status === 'offline') return prev.filter((id) => id !== userId);
            return prev;
          });
        }
      );

      newSocket.on(
        'unread_update',
        ({ type, dmId, senderId }: { type: string; dmId?: string; senderId?: string }) => {
          window.dispatchEvent(new CustomEvent('unread-update', { detail: { type, dmId, senderId } }));
        }
      );

      globalSocket = newSocket;
      globalSocketToken = token;
    };

    connectSocket();

    const onAuthChange = () => connectSocket();
    window.addEventListener('auth-change', onAuthChange);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('auth-change', onAuthChange);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket: socketState, isConnected, onlineUsers }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
