import React, { Fragment } from "react";

import { BrowserRouter as Router, Route } from "react-router-dom";

import Landing from "../pages/Landing";
import Channel from "../pages/Channel";

function AppRouter() {
  return (
    <Router>
      <Fragment>
        <Route exact path="/" component={Landing} />
        <Route path="/channel/:id" component={Channel} />
      </Fragment>
    </Router>
  );
}

export default AppRouter;
