import React from "react";

import { List } from "semantic-ui-react";

import Message from "./Message";

const messages = [
  {
    text: "This is a test message",
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  },
  {
    text: "This is a test message"
  }
];

function ChannelMessages() {
  const listItems = messages.map((msg, idx) => (
    <List.Item key={idx}>
      <Message message={msg} />
    </List.Item>
  ));

  return <List>{listItems}</List>;
}

export default ChannelMessages;
