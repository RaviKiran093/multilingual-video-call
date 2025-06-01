import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import SpeechToText from "./SpeechToText";

// Helpers to create blank/silent tracks for "hide video"/"mute audio"
function createSilentAudioTrack() {
  const ctx = new window.AudioContext();
  const oscillator = ctx.createOscillator();
  const dst = oscillator.connect(ctx.createMediaStreamDestination());
  oscillator.start();
  ctx.suspend();
  return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
}

function createBlankVideoTrack({ width = 640, height = 480 } = {}) {
  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ccc";
  ctx.fillRect(0, 0, width, height);
  const stream = canvas.captureStream();
  const track = stream.getVideoTracks()[0];
  track.enabled = false;
  return track;
}

// Add top global and Indian languages (with BCP-47 codes for browser ASR)
const LANGUAGES = [
  { code: "en-IN", name: "English (India)" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "hi-IN", name: "Hindi" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "zh-CN", name: "Chinese (Mandarin, China)" },
  { code: "zh-TW", name: "Chinese (Mandarin, Taiwan)" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)" },
  { code: "ru-RU", name: "Russian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "bn-BD", name: "Bengali (Bangladesh)" },
  { code: "bn-IN", name: "Bengali (India)" },
  { code: "pa-IN", name: "Punjabi" },
  { code: "te-IN", name: "Telugu" },
  { code: "ta-IN", name: "Tamil" },
  { code: "ml-IN", name: "Malayalam" },
  { code: "kn-IN", name: "Kannada" },
  { code: "mr-IN", name: "Marathi" },
  { code: "tr-TR", name: "Turkish" },
  { code: "vi-VN", name: "Vietnamese" },
  // Add more as needed
];

const socket = io("http://localhost:4000");

const VideoCall = ({ roomId }) => {
  // Hooks – all at top!
  const localVideoRef = useRef();
  const [remoteStreams, setRemoteStreams] = useState([]);
  const peerConnections = useRef({});
  const [transcript, setTranscript] = useState("");
  const [userSubs, setUserSubs] = useState({});
  const [usernames, setUsernames] = useState({});
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [selectedLang, setSelectedLang] = useState("en-IN");

  const localStreamRef = useRef(null);
  const localTracks = useRef({ video: null, audio: null });

  // Send own subtitles
  useEffect(() => {
    if (transcript?.trim()) {
      socket.emit('subtitle', {
        text: transcript,
        roomId,
        userId: socket.id,
        lang: selectedLang
      });
      setUserSubs(prev => ({
        ...prev,
        [socket.id]: { subtitle: transcript }
      }));
    }
  }, [transcript, roomId, selectedLang]);

  // Listen for others' subtitles
  useEffect(() => {
    const handleSubtitle = ({ text, userId }) => {
      setUserSubs(prev => ({
        ...prev,
        [userId]: { subtitle: text }
      }));
    };
    socket.on('subtitle', handleSubtitle);
    return () => socket.off('subtitle', handleSubtitle);
  }, []);

  // Translate new subtitles
  useEffect(() => {
    Object.entries(userSubs).forEach(([userId, { subtitle, translated }]) => {
      if (subtitle && !translated) {
        fetch("http://localhost:4000/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: subtitle, targetLanguage: "en" })
        })
          .then(res => res.json())
          .then(data => {
            setUserSubs(prev => ({
              ...prev,
              [userId]: { subtitle, translated: data.translated }
            }));
          })
          .catch(err => console.error("Translation error:", err));
      }
    });
  }, [userSubs]);

  // Handle toggling of audio/video tracks
  useEffect(() => {
    if (!localStreamRef.current) return;
    const stream = localStreamRef.current;

    // VIDEO
    if (isVideoOn) {
      if (!localTracks.current.video || localTracks.current.video.readyState !== "live") {
        navigator.mediaDevices.getUserMedia({ video: true }).then(newStream => {
          const newTrack = newStream.getVideoTracks()[0];
          stream.addTrack(newTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          Object.values(peerConnections.current).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track && s.track.kind === "video");
            if (sender) sender.replaceTrack(newTrack);
          });
          localTracks.current.video = newTrack;
        });
      } else {
        localTracks.current.video.enabled = true;
        Object.values(peerConnections.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(localTracks.current.video);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }
    } else {
      const blankTrack = createBlankVideoTrack();
      Object.values(peerConnections.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(blankTrack);
      });
      if (localVideoRef.current) {
        const blankStream = new MediaStream([blankTrack]);
        localVideoRef.current.srcObject = blankStream;
      }
    }

    // AUDIO
    if (isAudioOn) {
      if (localTracks.current.audio) localTracks.current.audio.enabled = true;
      Object.values(peerConnections.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === "audio");
        if (sender && localTracks.current.audio) sender.replaceTrack(localTracks.current.audio);
      });
    } else {
      const silentTrack = createSilentAudioTrack();
      Object.values(peerConnections.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === "audio");
        if (sender) sender.replaceTrack(silentTrack);
      });
    }

    socket.emit("media-state-changed", {
      roomId,
      userId: socket.id,
      video: isVideoOn,
      audio: isAudioOn
    });
    // eslint-disable-next-line
  }, [isVideoOn, isAudioOn, roomId]);

  // WebRTC logic
  useEffect(() => {
    if (!joined) return;
    let localStream = null;
    localStreamRef.current = null;

    const startMedia = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = localStream;
        localTracks.current.video = localStream.getVideoTracks()[0];
        localTracks.current.audio = localStream.getAudioTracks()[0];
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Join room with username
        socket.emit("join-room", { roomId, username });

        socket.on("user-joined", ({ userId, username: uName }) => {
          setUsernames(prev => ({ ...prev, [userId]: uName }));
        });

        socket.on("all-users", (others) => {
          const nameMap = {};
          others.forEach(({ userId, username: u }) => {
            nameMap[userId] = u;
          });
          setUsernames(prev => ({ ...prev, ...nameMap }));
        });

        socket.on("user-joined", async ({ userId, username: uName }) => {
          setUsernames(prev => ({ ...prev, [userId]: uName }));
          if (peerConnections.current[userId]) return;
          const peer = new RTCPeerConnection();
          peerConnections.current[userId] = peer;

          localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
          peer.ontrack = ({ streams }) => {
            const stream = streams[0];
            setRemoteStreams(prev => {
              const exists = prev.find(item => item.userId === userId);
              if (exists) return prev;
              return [...prev, { userId, stream, video: true, audio: true }];
            });
          };

          peer.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("signal", {
                to: userId,
                signal: { candidate: event.candidate }
              });
            }
          };

          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket.emit("signal", { to: userId, signal: offer });
        });

        socket.on("signal", async ({ from, signal }) => {
          let peer = peerConnections.current[from];
          if (!peer) {
            peer = new RTCPeerConnection();
            peerConnections.current[from] = peer;
            localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

            peer.ontrack = ({ streams }) => {
              const stream = streams[0];
              setRemoteStreams(prev => {
                const exists = prev.find(item => item.userId === from);
                if (exists) return prev;
                return [...prev, { userId: from, stream, video: true, audio: true }];
              });
            };

            peer.onicecandidate = (event) => {
              if (event.candidate) {
                socket.emit("signal", {
                  to: from,
                  signal: { candidate: event.candidate }
                });
              }
            };
          }

          if (signal.type === "offer") {
            if (peer.signalingState === "stable" || peer.signalingState === "have-remote-offer") {
              await peer.setRemoteDescription(signal);
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              socket.emit("signal", { to: from, signal: answer });
            }
          } else if (signal.type === "answer") {
            if (peer.signalingState === "have-local-offer") {
              await peer.setRemoteDescription(signal);
            }
          } else if (signal.candidate) {
            await peer.addIceCandidate(signal.candidate);
          }
        });

        socket.on("user-disconnected", (userId) => {
          setUsernames(prev => {
            const copy = { ...prev };
            delete copy[userId];
            return copy;
          });
          if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
          }
          setRemoteStreams(prev => prev.filter(item => item.userId !== userId));
        });

        socket.on("media-state-changed", ({ userId, video, audio }) => {
          setRemoteStreams(prev =>
            prev.map(item =>
              item.userId === userId
                ? { ...item, video, audio }
                : item
            )
          );
        });

      } catch (err) {
        console.error("Media error:", err);
      }
    };

    startMedia();

    return () => {
      socket.off("user-joined");
      socket.off("signal");
      socket.off("user-disconnected");
      socket.off("media-state-changed");
      socket.off("all-users");
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      setRemoteStreams([]);
    };
    // eslint-disable-next-line
  }, [roomId, joined]);

  const handleToggleAudio = () => setIsAudioOn(a => !a);
  const handleToggleVideo = () => setIsVideoOn(v => !v);

  return (
    <div>
      {!joined ? (
        <div style={{ textAlign: "center", marginTop: 50 }}>
          <h2>Enter your name to join the room:</h2>
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Your name"
            style={{ fontSize: 18, padding: 6, marginRight: 10 }}
          />
          <button
            style={{ fontSize: 18, padding: "6px 18px" }}
            disabled={!nameInput.trim()}
            onClick={() => { setUsername(nameInput.trim()); setJoined(true); }}
          >
            Join
          </button>
        </div>
      ) : (
        <>
          <h2>Room: {roomId}</h2>
          <div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{ width: "300px", margin: "5px", background: isVideoOn ? "black" : "#ccc" }}
            />
            <div style={{ textAlign: "center" }}>
              <span style={{ fontWeight: "bold" }}>{username} (Me)</span>
            </div>
            <div style={{ margin: "10px 0" }}>
              <button onClick={handleToggleAudio}>
                {isAudioOn ? "Mute Audio" : "Unmute Audio"}
              </button>
              <button onClick={handleToggleVideo} style={{ marginLeft: 10 }}>
                {isVideoOn ? "Disable Video" : "Enable Video"}
              </button>
            </div>
            <div style={{ margin: '10px 0' }}>
              <label>
                Input Language:{" "}
                <select
                  value={selectedLang}
                  onChange={e => setSelectedLang(e.target.value)}
                >
                  {LANGUAGES.map(lang => (
                    <option value={lang.code} key={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {remoteStreams.map(({ userId, stream, video }) => (
              <div key={userId} style={{ display: "inline-block", margin: "5px" }}>
                <video
                  autoPlay
                  style={{
                    width: "300px",
                    background: video === false ? "#ccc" : "black"
                  }}
                  ref={ref => ref && (ref.srcObject = stream)}
                />
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontWeight: "bold" }}>
                    {usernames[userId] ? usernames[userId] : "User"}
                  </span>
                  {video === false && <span style={{ marginLeft: 8, color: "#888" }}>Video Off</span>}
                </div>
              </div>
            ))}
          </div>
          <SpeechToText onTranscript={setTranscript} inputLang={selectedLang} />
          <div style={{ marginTop: 20, padding: 10, border: "1px solid #ccc" }}>
            <h3>Live Subtitles & Translations</h3>
            {Object.entries(userSubs).map(([userId, { subtitle, translated }]) => (
              <div key={userId} style={{ marginBottom: 8 }}>
                <strong>
                  {userId === socket.id
                    ? `${username} (Me)`
                    : usernames[userId]
                      ? usernames[userId]
                      : `User ${userId.substring(0, 5)}`}
                </strong><br />
                <small>Sub: {subtitle}</small><br />
                <small>→ {translated || "Translating..."}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCall;