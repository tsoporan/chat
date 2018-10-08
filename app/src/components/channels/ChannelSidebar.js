import React from "react";

import { List } from "semantic-ui-react";

const nicks = ["Bob", "Alice", "Joe", "Jane"];

function ChannelSidebar() {
  const listItems = nicks.map((nick, idx) => (
    <List.Item key={idx}>{nick}</List.Item>
  ));

  return <List>{listItems}</List>;
}

export default ChannelSidebar;
