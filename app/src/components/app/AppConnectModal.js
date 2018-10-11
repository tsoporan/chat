import React from "react";

import { Modal, Button, Icon, Form } from "semantic-ui-react";

class ConnectModal extends React.Component {
  state = { modalOpen: false };

  handleOpen = () =>
    this.setState({
      modalOpen: true
    });

  handleClose = () =>
    this.setState({
      modalOpen: false
    });

  render() {
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
            <Form>
              <Form.Group inline widths="equal">
                <Form.Input fluid label="Server" />
                <Form.Input fluid label="Port" />
              </Form.Group>
              <Form.Input fluid label="Nickname" />
              <Form.Input fluid label="Initial Channels" />
            </Form>
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button color="red" onClick={this.handleClose} inverted>
            <Icon name="cancel" /> Cancel
          </Button>
          <Button color="green" onClick={this.handleClose} inverted>
            <Icon name="checkmark" /> Connect
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}

export default ConnectModal;
