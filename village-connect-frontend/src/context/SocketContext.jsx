import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { disconnectSocket, getSocket, initSocket } from "../services/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (user && token) {
      const socketInstance = initSocket(token);
      socketRef.current = socketInstance;

      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      socketInstance.on("connect", handleConnect);
      socketInstance.on("disconnect", handleDisconnect);
      setIsConnected(socketInstance.connected);

      return () => {
        socketInstance.off("connect", handleConnect);
        socketInstance.off("disconnect", handleDisconnect);
        disconnectSocket();
        setIsConnected(false);
      };
    }

    disconnectSocket();
    setIsConnected(false);
    return undefined;
  }, [user?.id]);

  const on = useCallback((event, handler) => {
    const socketInstance = getSocket();
    if (socketInstance) socketInstance.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    const socketInstance = getSocket();
    if (socketInstance) socketInstance.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    const socketInstance = getSocket();
    if (socketInstance?.connected) socketInstance.emit(event, data);
  }, []);

  const value = useMemo(
    () => ({ isConnected, on, off, emit }),
    [emit, isConnected, off, on]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
