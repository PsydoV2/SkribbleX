import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

type RoomState = {
  players: Record<
    string,
    {
      id: string;
      name: string;
      score: number;
    }
  >;
  drawerId: string | null;
  word: string | null;
  round: number;
  started: boolean;
};

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [roomId, setRoomId] = useState("test-room");
  const [userId, setUserId] = useState(
    () => "user-" + Math.random().toString(36).slice(2, 8)
  );
  const [username, setUsername] = useState(
    "Player-" + Math.floor(Math.random() * 1000)
  );
  const [guess, setGuess] = useState("");

  useEffect(() => {
    const s = io(BACKEND_URL, { transports: ["websocket"] });
    setSocket(s);

    s.on("connect", () => {
      console.log("connected:", s.id);
    });

    s.on("state:update", (state: RoomState) => {
      console.log("state:update", state);
      setRoomState({ ...state });
    });

    s.on("round:start", (payload: { drawerId: string; wordLength: number }) => {
      console.log("round:start", payload);
      alert(
        `Neue Runde! Drawer: ${payload.drawerId}, Länge: ${payload.wordLength}`
      );
    });

    s.on("round:end", (payload: any) => {
      console.log("round:end", payload);
      alert(`"${payload.word}" wurde erraten! Gewinner: ${payload.winnerId}`);
      setRoomState((prev) =>
        prev ? { ...prev, players: payload.players } : prev
      );
    });

    s.on("draw:segment", (segment: any) => {
      // später für Canvas – erstmal loggen
      console.log("draw:segment", segment);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleJoin = () => {
    if (!socket) return;
    socket.emit("join", { roomId, userId, username });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("startGame", { roomId });
  };

  const handleGuess = () => {
    if (!socket) return;
    if (!guess.trim()) return;
    socket.emit("guess", { roomId, userId, text: guess });
    setGuess("");
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>SkribbleX – Dev Client</h1>

      <div style={{ marginBottom: 16 }}>
        <label>
          Room ID:{" "}
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ marginRight: 8 }}
          />
        </label>
        <label>
          Username:{" "}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginRight: 8 }}
          />
        </label>
        <button onClick={handleJoin}>Join Room</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={handleStartGame}>Spiel starten</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Dein Guess…"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGuess()}
          style={{ marginRight: 8 }}
        />
        <button onClick={handleGuess}>Raten</button>
      </div>

      <pre style={{ background: "#111", color: "#0f0", padding: 12 }}>
        {JSON.stringify(roomState, null, 2)}
      </pre>
    </div>
  );
}

export default App;
