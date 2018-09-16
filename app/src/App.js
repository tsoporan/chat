import React, { Component } from "react";

import { Container, Header, Divider } from "semantic-ui-react";

class App extends Component {
  render() {
    return (
      <Container fluid>
        <Header as="h1">#chat</Header>
        <Divider />
      </Container>
    );
  }
}

export default App;
