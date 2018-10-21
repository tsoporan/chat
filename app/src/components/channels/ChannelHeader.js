import React from "react";

import { List, Button } from "semantic-ui-react";

function ChannelHeader() {
  const rooms = ["#Foo", "#Bar", "#Baz", "#Bat"];

  const listItems = rooms.map((room, idx) => (
    <List.Item key={idx}>
      <Button>{room}</Button>
    </List.Item>
  ));

  return <List horizontal>{listItems}</List>;
}

export default ChannelHeader;
