import React from "react";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import Landing from "../pages/Landing";
import Channel from "../pages/Channel";
import NotFound from "../pages/NotFound";

import AppHeader from "../app/AppHeader";

function AppRouter() {
  return (
    <Router>
      <div>
        <AppHeader />
        <Switch>
          <Route exact path="/" component={Landing} />
          <Route path="/channel/:id" component={Channel} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </Router>
  );
}

export default AppRouter;
