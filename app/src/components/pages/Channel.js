import React, { Fragment } from "react";
import PropTypes from "prop-types";

import { Grid, Segment } from "semantic-ui-react";

import {
  ChannelHeader,
  ChannelMessages,
  ChannelSidebar,
  ChannelMessageBox
} from "../../components/channels";

function Channel(props) {
  const { match } = props;

  return (
    <Grid>
      <Grid.Row>
        <ChannelHeader />
      </Grid.Row>

      <Grid.Row>
        <Grid.Column width={12}>
          <ChannelMessages />
        </Grid.Column>
        <Grid.Column width={4}>
          <ChannelSidebar />
        </Grid.Column>
      </Grid.Row>

      <Grid.Row>
        <ChannelMessageBox />
        {match.params.id}
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
