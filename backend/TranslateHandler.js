const WebSocket = require('ws'); // Ensure this is declared only once at the top
const { spawn } = require('child_process');
const axios = require('axios');

// LibreTranslate Public API URL
const TRANSLATE_API_URL = "https://libretranslate.com/translate";

// WebSocket Server for Real-Time Translation
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', async (message) => {
    try {
      const { audioPath, targetLanguage } = JSON.parse(message);

      // Step 1: Speech-to-Text using Whisper
      const transcription = await speechToText(audioPath);

      console.log('Transcription:', transcription);

      // Step 2: Translate Text using LibreTranslate
      const translation = await translateText(transcription, targetLanguage);

      console.log('Translation:', translation);

      // Step 3: Send Translated Text Back
      ws.send(JSON.stringify({ transcription, translation }));
    } catch (error) {
      console.error('Error processing:', error.message);
      ws.send(JSON.stringify({ error: 'Translation failed: ' + error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Speech-to-Text Function using OpenAI Whisper
async function speechToText(audioPath) {
  return new Promise((resolve, reject) => {
    const whisper = spawn('whisper', [audioPath, '--language', 'en', '--model', 'base', '--output_format', 'txt']);

    let transcription = '';
    whisper.stdout.on('data', (data) => {
      transcription += data.toString();
    });

    whisper.stderr.on('data', (data) => {
      console.error('Whisper error:', data.toString());
    });

    whisper.on('close', (code) => {
      if (code === 0) {
        resolve(transcription.trim());
      } else {
        reject(new Error('Whisper transcription failed'));
      }
    });
  });
}

// Text Translation Function using LibreTranslate
async function translateText(text, targetLanguage) {
  try {
    const response = await axios.post(TRANSLATE_API_URL, {
      q: text,
      source: "en",
      target: targetLanguage,
      format: "text",
    });
    return response.data.translatedText;
  } catch (error) {
    throw new Error('LibreTranslate API failed');
  }
}