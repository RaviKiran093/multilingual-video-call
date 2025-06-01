import { useEffect } from "react";

const Translate = ({ text, targetLanguage = "en", onTranslation }) => {
  useEffect(() => {
    if (!text) { onTranslation && onTranslation(""); return; }
    fetch("http://localhost:4000/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage }),
    })
      .then(res => res.json())
      .then(data => {
        onTranslation && onTranslation(data.translated || "Translation failed.");
      })
      .catch(() => {
        onTranslation && onTranslation("Translation failed.");
      });
  }, [text, targetLanguage, onTranslation]);
  return null;
};
export default Translate;