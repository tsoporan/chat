import React from "react";

import { Link } from "react-router-dom";

import { Grid, Header } from "semantic-ui-react";

function AppHeader() {
  return (
    <Grid>
      <Grid.Row>
        <Grid.Column width={8}>
          <Header as="h1">#chat</Header>
        </Grid.Column>
        <Grid.Column width={8}>
          <Link to="/">Home</Link>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
}

export default AppHeader;
