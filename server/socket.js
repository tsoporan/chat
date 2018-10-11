/*
 * Socket event handling
 */

const socketServer = require("server");

const { log } = require("utils");
const { onDisconnect, onConnectToIRC } = require("handlers");

// On connection store the socket and newly created client
socketServer.on("connection", onConnect);

function onConnect(socket) {
  log("Socket connected: " + socket.id);

  socket.on("disconnect", () => {
    onDisconnect(socket);
  });

  socket.on("connectToIRC", data => {
    onConnectToIRC(socket, data);
  });
}
