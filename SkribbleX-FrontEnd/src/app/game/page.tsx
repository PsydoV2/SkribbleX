"use client";

import ConnectionStatus from "@/components/ConnectionStatus";
import GamePage from "@/components/GamePage";
import SelectMenu from "@/components/SelectMenu";
import { useToast } from "@/hooks/ToastContext";
import { useEffect, useState } from "react";
import { socket } from "@/socket";
import { socketService } from "@/service/socket.service";

export default function Game() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomID, setRoomID] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const handleJoinRoom = async (roomID: string) => {
    try {
      await socketService.joinRoom(roomID);
      setRoomID(roomID);
    } catch (err) {
      console.error("Failed to join room", err);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const roomID: string = await socketService.createRoom();
      setRoomID(roomID);
    } catch (err) {
      console.error("Failed to create room", err);
      setRoomID("000000");
      showToast("error", err + "");
    }
    // setRoomID("000000");
  };

  return (
    <>
      <ConnectionStatus isConnected={isConnected}></ConnectionStatus>

      {roomID === "" ? (
        <SelectMenu
          createRoom={handleCreateRoom}
          joinRoom={(givenRoomID) => handleJoinRoom(givenRoomID)}
        ></SelectMenu>
      ) : (
        <GamePage roomID={roomID}></GamePage>
      )}
    </>
  );
}
