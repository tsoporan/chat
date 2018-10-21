import React from "react";

import { Grid, Header } from "semantic-ui-react";

function AppNotFound() {
  return (
    <Grid verticalAlign="middle" style={{ height: "calc(100vh - 100px)" }}>
      <Grid.Column textAlign="center">
        <Header>:( Not Found</Header>
      </Grid.Column>
    </Grid>
  );
}

export default AppNotFound;
