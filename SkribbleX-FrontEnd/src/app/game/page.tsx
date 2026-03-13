// src/app/game/page.tsx
"use client";
import { useEffect, useState } from "react";
import ConnectionStatus from "@/components/ConnectionStatus";
import GamePage from "@/components/GamePage";
import SelectMenu from "@/components/SelectMenu";
import { useToast } from "@/hooks/ToastContext";
import { getSocket } from "@/socket";
import { socketService } from "@/service/socket.service";

export default function Game() {
  // getSocket() is safe here — "use client" guarantees browser-only execution
  const socket = getSocket();

  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomID, setRoomID] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  const handleJoinRoom = async (id: string) => {
    try {
      // TODO: replace placeholders with real Discord identity from the SDK
      await socketService.joinRoom(id, "discord-user-id", "Player");
      setRoomID(id);
    } catch (err) {
      console.error("Failed to join room", err);
      showToast("error", err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateRoom = async () => {
    try {
      const id = await socketService.createRoom();
      setRoomID(id);
    } catch (err) {
      console.error("Failed to create room", err);
      showToast("error", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <ConnectionStatus isConnected={isConnected} />

      {roomID === "" ? (
        <SelectMenu createRoom={handleCreateRoom} joinRoom={handleJoinRoom} />
      ) : (
        <GamePage roomID={roomID} />
      )}
    </>
  );
}
