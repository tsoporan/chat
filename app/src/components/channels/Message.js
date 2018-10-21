import React from "react";
import PropTypes from "prop-types";

const messageStyles = {
  background: "#e9e9e9",
  padding: "8px",
  borderRadius: "3px"
};

function Message({ message }) {
  return (
    <p style={messageStyles}>
      {message.timestamp} {message.text}
    </p>
  );
}

Message.propTypes = {
  message: PropTypes.object
};

export default Message;
