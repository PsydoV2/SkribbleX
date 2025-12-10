interface PlayerProps {
  name: string;
  isHost: boolean;
  profilePic: string;
  points: number;
}

export default function Player(props: PlayerProps) {
  return (
    <div className="player">
      <img className="playerPic" src={props.profilePic}></img>
      <div className="playerInfoWrapper">
        <p>{props.name}</p>
        <span>{props.points}</span>
      </div>
      {props.isHost && <p>👑</p>}
    </div>
  );
}
