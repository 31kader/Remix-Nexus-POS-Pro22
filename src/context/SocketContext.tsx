import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSecureItem } from '../lib/security';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let newSocket: Socket | null = null;
    try {
      const session = getSecureItem<any>('nexus_active_online_session') || getSecureItem<any>('nexus_active_offline_session');
      const token = session ? session.uid : 'anonymous';

      newSocket = io(window.location.origin, {
        transports: ['polling', 'websocket'], // Prefer polling first for better compatibility in proxied envs
        reconnectionAttempts: 3,
        timeout: 10000,
        auth: { token }
      });

      newSocket.on('connect_error', (error) => {
        console.warn('Socket connection error (expected in some environments):', error.message);
      });

      setSocket(newSocket);
    } catch (err) {
      console.error('Failed to initialize socket:', err);
    }

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
