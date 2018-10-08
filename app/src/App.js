import React, { Component } from "react";

import { Container, Divider } from "semantic-ui-react";

import AppHeader from "./components/Header";
import ChannelsContainer from "./components/ChannelsContainer";

class App extends Component {
  render() {
    return (
      <Container fluid>
        <AppHeader />
        <Divider />
        <ChannelsContainer />
      </Container>
    );
  }
}

export default App;
