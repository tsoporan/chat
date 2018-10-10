import React, { Component } from "react";

import { Container } from "semantic-ui-react";

import AppHeader from "./AppHeader";
import AppRouter from "./AppRouter";

class App extends Component {
  render() {
    return (
      <AppRouter>
        <Container fluid>
          <AppHeader />
        </Container>
      </AppRouter>
    );
  }
}

export default App;
