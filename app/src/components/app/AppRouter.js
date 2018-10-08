import React, { Fragment } from "react";
import PropTypes from "prop-types";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import AppNotFound from "./AppNotFound";

import Landing from "../pages/Landing";
import Channel from "../pages/Channel";

function AppRouter(props) {
  return (
    <Router>
      <Fragment>
        {props.children}
        <Switch>
          <Route exact path="/" component={Landing} />
          <Route path="/channel/:id" component={Channel} />
          <Route component={AppNotFound} />
        </Switch>
      </Fragment>
    </Router>
  );
}

AppRouter.propTypes = {
  children: PropTypes.node.isRequired
};

export default AppRouter;
