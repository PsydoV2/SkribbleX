import { useToast } from "../hooks/ToastContext";
import { motion } from "framer-motion";
import Player from "./Player";

interface GamePageProps {
  roomID: string;
}

export default function GamePage(props: GamePageProps) {
  const handleCopyRoomID = () => {
    const text = document.getElementById("roomID")?.innerText || "";
    navigator.clipboard.writeText(text);

    showToast("success", "Copied!");
  };

  const { showToast } = useToast();

  return (
    <div className="gamePage">
      <div className="gameFrame">
        <div className="gameTopBar">
          <span>Round 00 of 99</span>
          <span>_________</span>
          <motion.span
            id="roomID"
            onClick={handleCopyRoomID}
            whileTap={{ scale: 0.85 }}
            transition={{ type: "spring", stiffness: 500, damping: 12 }}
          >
            {props.roomID}
          </motion.span>
        </div>
        <div className="gamePlayerList">
          <Player
            isHost
            name="Psydo"
            points={125}
            profilePic="https://media.istockphoto.com/id/517998264/vector/male-user-icon.jpg?s=612x612&w=0&k=20&c=4RMhqIXcJMcFkRJPq6K8h7ozuUoZhPwKniEke6KYa_k="
          ></Player>
        </div>
        <canvas className="gameCanvas"></canvas>
        <div className="gameGuessChat"></div>
      </div>
    </div>
  );
}
