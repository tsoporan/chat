import React, { Fragment } from "react";

import ChannelList from "./ChannelList";
import ChannelArea from "./ChannelArea";
import ChannelMessageBox from "./ChannelMessageBox";

function ChannelContainer() {
  return (
    <Fragment>
      <ChannelList />
      <ChannelArea />
      <ChannelMessageBox />
    </Fragment>
  );
}

export default ChannelContainer;
