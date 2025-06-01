import React from "react";
import PropTypes from "prop-types";

const Subtitles = ({ text }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "80%",
        textAlign: "center",
        color: "white",
        background: "rgba(0, 0, 0, 0.5)",
        padding: "10px",
        borderRadius: "10px",
        fontSize: "16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <p>{text || "Waiting for subtitles..."}</p>
    </div>
  );
};

Subtitles.propTypes = {
  text: PropTypes.string,
};

Subtitles.defaultProps = {
  text: "",
};

export default Subtitles;