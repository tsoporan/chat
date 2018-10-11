import React, { Component } from "react";

import { Container } from "semantic-ui-react";

import Socket from "../socket";

import AppHeader from "./app/AppHeader";
import AppRouter from "./app/AppRouter";

class App extends Component {
  state = {
    online: false
  };

  componentDidMount() {
    Socket.on("connect", () => {
      this.setState({
        online: true
      });
    });

    Socket.on("disconnect", () => {
      this.setState({ online: false });
    });
  }

  render() {
    const { online } = this.state;

    return (
      <AppRouter>
        <Container fluid>
          <AppHeader online={online} />
        </Container>
      </AppRouter>
    );
  }
}

export default App;
