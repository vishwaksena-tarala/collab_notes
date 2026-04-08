import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

/**
 * Get (or lazily create) the Socket.IO client singleton.
 * Passes the JWT token as auth credential for server-side validation.
 *
 * @returns {import('socket.io-client').Socket}
 */
export const getSocket = () => {
  const token = localStorage.getItem('cn_token');

  if (!socket || !socket.connected) {
    // Disconnect stale socket if exists
    if (socket) socket.disconnect();

    socket = io(SOCKET_URL, {
      auth: { token },       // Sent to server via socket.handshake.auth.token
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('🟢 Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('🔴 Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🟡 Socket disconnected:', reason);
    });
  }

  return socket;
};

/**
 * Disconnect and destroy the socket (call on logout).
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
