import React from "react";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import Landing from "../pages/Landing";
import Channel from "../pages/Channel";
import NotFound from "../pages//NotFound";

function AppRouter() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Landing} />
        <Route path="/channel/:id" component={Channel} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default AppRouter;
