import React, { Fragment } from "react";
import PropTypes from "prop-types";

import { BrowserRouter as Router, Route } from "react-router-dom";

import Landing from "../pages/Landing";
import Channel from "../pages/Channel";

function AppRouter(props) {
  return (
    <Router>
      <Fragment>
        {props.children}
        <Route exact path="/" component={Landing} />
        <Route path="/channel/:id" component={Channel} />
      </Fragment>
    </Router>
  );
}

AppRouter.propTypes = {
  children: PropTypes.node.isRequired
};

export default AppRouter;
