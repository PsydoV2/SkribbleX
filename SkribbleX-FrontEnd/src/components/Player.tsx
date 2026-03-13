import "@/styles/Player.css";
import Image from "next/image";

interface PlayerProps {
  name: string;
  isHost: boolean;
  profilePic: string;
  points: number;
}

export default function Player(props: PlayerProps) {
  return (
    <div className="player">
      <Image className="playerPic" src={props.profilePic} alt="" />
      <div className="playerInfoWrapper">
        <p>{props.name}</p>
        <span>{props.points}</span>
      </div>
      {props.isHost && <p>👑</p>}
    </div>
  );
}
