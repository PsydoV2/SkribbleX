import { useEffect, useState } from "react";
import { socket } from "./socket";
import ConnectionStatus from "./components/ConnectionStatus";
import SelectMenu from "./components/SelectMenu";
import GamePage from "./components/GamePage";
import { SocketService } from "./service/socket.service";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [roomID, setRoomID] = useState("");
  const socketHelper: SocketService = new SocketService();

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

  const handleJoinRoom = (roomID: string) => {
    setRoomID(roomID);
    socketHelper.joinRoom(roomID);
  };

  return (
    <>
      <ConnectionStatus isConnected={isConnected}></ConnectionStatus>

      {roomID === "" ? (
        <SelectMenu
          createRoom={() => socketHelper.createRoom()}
          joinRoom={(givenRoomID) => handleJoinRoom(givenRoomID)}
        ></SelectMenu>
      ) : (
        <GamePage></GamePage>
      )}
    </>
  );
}

export default App;
