import React, { Fragment } from "react";

import Channel from "./Channel";
import ChannelSidebar from "./ChannelSidebar";

function ChannelArea() {
  return (
    <Fragment>
      <Channel />
      <ChannelSidebar />
    </Fragment>
  );
}

export default ChannelArea;
