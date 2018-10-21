import React from "react";
import PropTypes from "prop-types";

import { Link } from "react-router-dom";
import { Grid, Header, List, Button } from "semantic-ui-react";

import AppConnectModal from "./AppConnectModal";

function AppHeader({ online }) {
  return (
    <Grid padded>
      <Grid.Row>
        <Grid.Column width={8}>
          <Header as="h1">
            <Link to="/">#chat</Link>
          </Header>
        </Grid.Column>
        <Grid.Column width={8} textAlign="right">
          <List horizontal>
            <List.Item>
              <p>{online ? "Online" : "Offline"}</p>
            </List.Item>
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

AppHeader.propTypes = {
  online: PropTypes.bool
};

export default AppHeader;
