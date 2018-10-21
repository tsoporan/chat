import React from "react";

import { List, Button } from "semantic-ui-react";

const channels = ["#Foo", "#Bar", "#Baz", "#Bat"];

function ChannelHeader() {
  const listItems = channels.map((channel, idx) => (
    <List.Item key={idx}>
      <Button>{channel}</Button>
    </List.Item>
  ));

  return <List horizontal>{listItems}</List>;
}

export default ChannelHeader;
