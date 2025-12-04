import { useEffect, useState } from "react";
import { socket } from "./socket";
import ConnectionStatus from "./components/ConnectionStatus";
import SelectMenu from "./components/SelectMenu";

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

  return (
    <>
      <ConnectionStatus isConnected={isConnected}></ConnectionStatus>

      {roomID === "" ? <SelectMenu></SelectMenu> : <></>}
    </>
  );
}

export default App;
