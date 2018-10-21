import React from "react";
import PropTypes from "prop-types";

import { Grid } from "semantic-ui-react";

import {
  ChannelHeader,
  ChannelMessages,
  ChannelSidebar,
  ChannelMessageBox
} from "../../components/channels";

function Channel(props) {
  const { match } = props;

  return (
    <Grid stackable padded>
      <Grid.Row>
        <Grid.Column>
          <ChannelHeader />
        </Grid.Column>
      </Grid.Row>

      <Grid.Row style={{ height: "calc(100vh - 220px)", overflow: "auto" }}>
        <Grid.Column width={12}>
          <ChannelMessages />
        </Grid.Column>
        <Grid.Column width={4}>
          <ChannelSidebar />
        </Grid.Column>
      </Grid.Row>

      <Grid.Row>
        <Grid.Column verticalAlign="bottom">
          <ChannelMessageBox />
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
}

Channel.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string
    })
  })
};

export default Channel;
