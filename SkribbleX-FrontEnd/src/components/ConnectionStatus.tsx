interface StatusProps {
  isConnected: boolean;
}

export default function ConnectionStatus(props: StatusProps) {
  return (
    <div className="statusWrapper">
      {/* <p>Status</p> */}
      <div
        className={
          props.isConnected
            ? "statusCircle connected"
            : "statusCircle disconnected"
        }
      ></div>
    </div>
  );
}
