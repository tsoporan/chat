import React from "react";

import { Header, Segment } from "semantic-ui-react";

function AppHeader() {
  return (
    <Segment.Group horizontal>
      <Segment>
        <Header as="h1">#chat</Header>
      </Segment>
      <Segment>Links</Segment>
    </Segment.Group>
  );
}

export default AppHeader;
