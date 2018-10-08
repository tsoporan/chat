import React from "react";
import { Form } from "semantic-ui-react";

function ChannelMessageBox() {
  return (
    <Form>
      <Form.Group>
        <Form.Input fluid width={14} placeholder="Your message" />
        <Form.Button fluid width={2}>
          Send
        </Form.Button>
      </Form.Group>
    </Form>
  );
}

export default ChannelMessageBox;
