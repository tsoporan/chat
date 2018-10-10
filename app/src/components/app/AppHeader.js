import React from "react";

import { Grid, Header, List, Button } from "semantic-ui-react";

import AppConnectModal from "./AppConnectModal";

function AppHeader() {
  return (
    <Grid padded>
      <Grid.Row fluid>
        <Grid.Column width={12}>
          <Header as="h1">#chat</Header>
        </Grid.Column>
        <Grid.Column width={4} textAlign="right">
          <List horizontal>
            <List.Item>
              <AppConnectModal />
            </List.Item>
            <List.Item>
              <Button>GitHub</Button>
            </List.Item>
          </List>
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
}

export default AppHeader;
