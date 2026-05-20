import { io } from 'socket.io-client';

// In development, Vite proxies /socket.io to the backend (port 3001)
// The socket.io client should connect to the same origin where the page is served
const socket = io({
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export default socket;
