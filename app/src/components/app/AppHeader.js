import React from "react";

import { Link } from "react-router-dom";

import { Header, Segment } from "semantic-ui-react";

function AppHeader() {
  return (
    <Segment.Group horizontal>
      <Segment>
        <Header as="h1">#chat</Header>
      </Segment>
      <Segment>
        <Link to="/">Home</Link>
      </Segment>
    </Segment.Group>
  );
}

export default AppHeader;
