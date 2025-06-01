import React, { useEffect, useState } from "react";
import Subtitles from "./Subtitles";

const WebSocketClient = () => {
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    // Connect to the WebSocket server
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("WebSocket connection established");

      // Example: Send audio file path and target language
      ws.send(
        JSON.stringify({
          audioPath: "example.wav", // Replace with actual audio file path
          targetLanguage: "es", // Replace with target language code (e.g., "es" for Spanish)
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.transcription && data.translation) {
        console.log("Transcription:", data.transcription);
        console.log("Translation:", data.translation);
        setTranslation(data.translation);
      } else if (data.error) {
        console.error("Error:", data.error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, []);

  return <Subtitles text={translation} />;
};

export default WebSocketClient;