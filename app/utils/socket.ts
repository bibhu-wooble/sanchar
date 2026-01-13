import { io } from "socket.io-client";

// Use environment variable or default to same origin (relative URL)
// In production, this will use the same domain as the app
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const socket = io(socketUrl);
