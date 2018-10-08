import React, { Component } from "react";

import { Container, Divider } from "semantic-ui-react";

import AppHeader from "./AppHeader";
import AppRouter from "./AppRouter";

class App extends Component {
  render() {
    return (
      <AppRouter>
        <Container fluid>
          <AppHeader />
          <Divider />
        </Container>
      </AppRouter>
    );
  }
}

export default App;
