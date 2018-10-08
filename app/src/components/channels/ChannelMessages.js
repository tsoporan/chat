import React from "react";

import { List } from "semantic-ui-react";

const messages = [
  "This is a test message",
  "Second test message, look at me",
  "Tis the third message",
  "Fourth, I'm the last message :("
];

function ChannelMessages() {
  const listItems = messages.map((msg, idx) => (
    <List.Item key={idx}>{msg}</List.Item>
  ));

  return <List>{listItems}</List>;
}

export default ChannelMessages;
