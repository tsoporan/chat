import React from "react";

import { List } from "semantic-ui-react";

const channels = ["#Foo", "#Bar", "#Baz", "#Bat"];

function ChannelHeader() {
  const listItems = channels.map((channel, idx) => (
    <List.Item key={idx}>{channel}</List.Item>
  ));

  return <List>{listItems}</List>;
}

export default ChannelHeader;
