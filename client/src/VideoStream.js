import React, { useRef, useEffect } from "react";

const VideoStream = () => {
  const videoRef = useRef();

  useEffect(() => {
    const getVideoStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Error accessing video stream:", error);
      }
    };

    getVideoStream();
  }, []);

  return <video ref={videoRef} autoPlay playsInline />;
};

export default VideoStream;