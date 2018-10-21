import React, { Component } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { Container } from "semantic-ui-react";

import Socket from "../socket";

import AppHeader from "./app/AppHeader";

import Landing from "./pages/Landing";
import Channel from "./pages/Channel";
import NotFound from "./pages/NotFound";

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
      <Container fluid style={{ height: "100%" }}>
        <Router>
          <div>
            <AppHeader online={online} />
            <Switch>
              <Route exact path="/" component={Landing} />
              <Route path="/channel/:id" component={Channel} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </Router>
      </Container>
    );
  }
}

export default App;
