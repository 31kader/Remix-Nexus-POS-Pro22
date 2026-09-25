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
      if (!session || !session.uid) {
        return;
      }
      const token = session.uid;

      newSocket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 5000,
        auth: { token }
      });

      newSocket.on('connect_error', () => {
        // Silencieux en environnement statique / PWA sans serveur Socket.IO
        newSocket?.close();
      });

      setSocket(newSocket);
    } catch {
      // Ignorer silencieusement en mode statique
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
