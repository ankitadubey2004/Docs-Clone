import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!currentUser || !token) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

    const s = io(backendUrl, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => console.log('✅ Socket connected', s.id));
    s.on('connect_error', (err) => console.error('❌ Socket connect error', err.message));

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [currentUser]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
