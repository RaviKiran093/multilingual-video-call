import React, { useEffect } from "react";

const TextToSpeech = ({ text }) => {
  useEffect(() => {
    if (text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US"; // Set the language for speech
      window.speechSynthesis.speak(utterance);
    }
  }, [text]);

  return null; // No UI, just functionality
};

export default TextToSpeech;