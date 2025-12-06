import { useState } from "react";
import { FaChevronRight } from "react-icons/fa6";
import OtpInput from "react-otp-input";

interface SelectMenuProps {
  joinRoom: (roomID: string) => void;
  createRoom: () => void;
}

export default function SelectMenu(props: SelectMenuProps) {
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [roomID, setRoomID] = useState("");

  return (
    <div className="selectMenuWrapper">
      {showJoinScreen ? (
        <div className="smJoinCon">
          <h2>Enter room code</h2>

          <OtpInput
            value={roomID}
            onChange={setRoomID}
            numInputs={6}
            renderInput={(props) => (
              <input
                {...props}
                className={`otp-input ${roomID.length === 6 ? "otp-done" : ""}`}
              />
            )}
          />

          <button onClick={() => props.joinRoom(roomID)}>
            <FaChevronRight />
          </button>

          <button onClick={() => setShowJoinScreen(false)}>BACK</button>
        </div>
      ) : (
        <>
          <div className="smLeftCon smCon" onClick={props.createRoom}>
            <h2>CREATE</h2>
            <p>
              Create your own room and share the code with friends. You set the
              stage — the drawing battle begins!
            </p>
          </div>
          <div
            className="smRightCon smCon"
            onClick={() => setShowJoinScreen(true)}
          >
            <h2>JOIN</h2>
            <p>
              Enter a 6-digit room code to join an existing game. Jump right in
              and start guessing or drawing with the group.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
