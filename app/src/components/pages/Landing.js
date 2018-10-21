import React from "react";

import { Header, List, Button, Grid } from "semantic-ui-react";

function Landing() {
  const popularNetworks = [
    {
      name: "Freenode",
      address: "chat.freenode.net",
      port: 6667
    },
    {
      name: "IRCNet",
      address: "irc.net",
      port: 6667
    },
    {
      name: "QuakeNet",
      address: "irc.quakenet.org",
      port: 6667
    },
    {
      name: "hashbang",
      address: "",
      port: 6667
    }
  ];

  const listItems = popularNetworks.map((network, idx) => (
    <List.Item as="a" key={idx}>
      <Button>{network.name}</Button>
    </List.Item>
  ));

  return (
    <Grid
      verticalAlign="middle"
      style={{ height: "calc(100vh - 50px)", marginTop: "-50px" }}
    >
      <Grid.Column textAlign="center">
        <Header as="h2" textAlign="center">
          <Header.Content>
            {"Let's chat! Connect to get started."}
          </Header.Content>
          <Header.Subheader>
            First time? Choose from a network below.
          </Header.Subheader>
        </Header>
        <List horizontal>{listItems}</List>
      </Grid.Column>
    </Grid>
  );
}

export default Landing;
