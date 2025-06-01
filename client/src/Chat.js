import React, { useState } from "react";

const Chat = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");

  const sendMessage = () => {
    if (currentMessage.trim() !== "") {
      const newMessage = { id: Date.now(), text: currentMessage };
      setMessages([...messages, newMessage]);
      setCurrentMessage("");
    }
  };

  return (
    <div className="chat-box">
      <h2>Chat Room: {roomId}</h2>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            {msg.text}
          </div>
        ))}
      </div>
      <div className="input-box">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;