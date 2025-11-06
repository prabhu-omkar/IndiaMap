import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || undefined;

const socket = io(URL as any, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export default socket;
