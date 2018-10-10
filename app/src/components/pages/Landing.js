import React, { Fragment } from "react";

import { Header, List } from "semantic-ui-react";

const popularNetworks = ["freenode", "efnet", "hashbang"];

function Landing() {
  const listItems = popularNetworks.map((network, idx) => (
    <List.Item key={idx}>{network}</List.Item>
  ));

  return (
    <Fragment>
      <Header as="h2" textAlign="center">
        <Header.Content>Let's chat! Connect to get started.</Header.Content>
        <Header.Subheader>
          First time? Choose from a popular network below.
        </Header.Subheader>
      </Header>
      <List>{listItems}</List>
    </Fragment>
  );
}

export default Landing;
