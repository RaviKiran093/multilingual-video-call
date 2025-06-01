import React, { useState, useEffect } from "react";

const SpeechToText = ({ onTranscript, inputLang = "te-IN" }) => {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = inputLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      onTranscript(transcript);
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => {
      recognition.abort();
    };
  }, [isListening, onTranscript, inputLang]);

  return (
    <div>
      <button onClick={() => setIsListening((l) => !l)}>
        {isListening ? "Stop Listening" : "Start Listening"}
      </button>
    </div>
  );
};

export default SpeechToText;