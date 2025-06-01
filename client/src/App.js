import React, { useState } from "react";
import VideoCall from "./VideoCall";
import Chat from "./Chat";
import "./App.css";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoinRoom = () => {
    if (roomId.trim() !== "") setJoined(true);
    else alert("Please enter a valid Room ID.");
  };

  const handleLeaveRoom = () => {
    setJoined(false);
    setRoomId("");
  };

  return (
    <div className="App">
      <h1>Multilingual Video Call and Chat</h1>
      {!joined ? (
        <div>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <VideoCall roomId={roomId} />
          <Chat roomId={roomId} />
          <button onClick={handleLeaveRoom}>Leave Room</button>
        </div>
      )}
    </div>
  );
}
export default App;