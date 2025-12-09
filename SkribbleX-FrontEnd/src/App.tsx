import { useEffect, useState } from "react";
import { socket } from "./socket";
import ConnectionStatus from "./components/ConnectionStatus";
import SelectMenu from "./components/SelectMenu";
import GamePage from "./components/GamePage";
import { socketService } from "./service/socket.service";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomID, setRoomID] = useState("");

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
    }
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

export default App;
