import React from "react";

function Channel(props) {
  const { match } = props;

  return <div>Channel Detail {match.params.id}</div>;
}

export default Channel;
