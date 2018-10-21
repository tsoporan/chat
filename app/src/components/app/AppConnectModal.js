import React from "react";

import { Modal, Button, Icon, Form } from "semantic-ui-react";

import Socket from "../../socket";

class ConnectModal extends React.Component {
  state = {
    modalOpen: false,
    server: "",
    port: "",
    nickname: "",
    initialChannels: []
  };

  handleOpen = () =>
    this.setState({
      modalOpen: true
    });

  handleClose = () =>
    this.setState({
      modalOpen: false
    });

  handleSubmit = () => {
    this.setState({
      modalOpen: false,
      server: "",
      port: "",
      nickname: "",
      initialChannels: []
    });
  };

  handleChange = evt => {
    this.setState({
      [evt.target.name]: evt.target.value
    });
  };

  render() {
    const { server, port, nickname, initialChannels } = this.state;

    return (
      <Modal
        trigger={<Button onClick={this.handleOpen}>Connect</Button>}
        open={this.state.modalOpen}
        onClose={this.handleClose}
        size="small"
      >
        <Modal.Header>Connect to a network</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Form onChange={this.handleChange}>
              <Form.Group inline widths="equal">
                <Form.Input
                  fluid
                  label="Server"
                  name="server"
                  value={server}
                  placeholder="ex. irc.freenode.net"
                />
                <Form.Input
                  fluid
                  label="Port"
                  name="port"
                  value={port}
                  placeholder="6667"
                />
              </Form.Group>
              <Form.Input
                fluid
                label="Nickname"
                name="nickname"
                value={nickname}
                placeholder="John Doe"
              />
              <Form.Input
                fluid
                label="Initial Channels"
                name="initialChannels"
                value={initialChannels}
                placeholder="#linux, #social"
              />
            </Form>
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button color="red" onClick={this.handleClose} inverted>
            <Icon name="cancel" /> Cancel
          </Button>
          <Button color="green" onClick={this.handleSubmit} inverted>
            <Icon name="checkmark" /> Connect
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}

export default ConnectModal;
