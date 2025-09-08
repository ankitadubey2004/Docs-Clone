// src/services/socket.js
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

let socket;

export const initSocket = (token) => {
  if (socket && socket.connected) return socket;
  socket = io(BACKEND_URL, {
    auth: {
      token: `Bearer ${token}`
    }
  });
  return socket;
};

export const getSocket = () => {
  if (!socket) throw new Error('Socket not initialized - call initSocket(token) first');
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
