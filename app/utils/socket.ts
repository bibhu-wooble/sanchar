import { io, Socket } from "socket.io-client";

// Use environment variable or default to same origin (relative URL)
// In production, this will use the same domain as the app
// NOTE: Vercel doesn't support WebSockets. You need to deploy a separate socket server
// or use a service like Pusher/Ably. Set NEXT_PUBLIC_SOCKET_URL to your socket server URL.
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

// Create socket with better error handling and reconnection
export const socket = io(socketUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  timeout: 20000,
  autoConnect: true,
});

// Handle connection errors gracefully
socket.on('connect_error', (error) => {
  console.warn('Socket connection error:', error.message);
  // Don't show error to user - app will work without real-time features
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});
