import { useToast } from "../hooks/ToastContext";
import { motion } from "framer-motion";

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
      <motion.p
        id="roomID"
        onClick={handleCopyRoomID}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 12 }}
      >
        {props.roomID}
      </motion.p>
    </div>
  );
}
