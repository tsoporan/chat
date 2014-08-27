var http       = require('http'),
    app        = require('./app'),
    socketio   = require('socket.io'),
    irc        = require('irc'),
    moment     = require('moment'),
    httpServer = http.Server(app),
    io         = socketio(httpServer),
    clients    = {};


function disconnectCleanup (socket) {

  var _disconnect = function () {

    var user = clients[socket.id]

    if (user && user.client) {
      user.client.disconnect(function() {
        socket.emit('ircDisconnected', {
          when : moment()
        });
      });

      delete clients[socket.id];
      console.log('User disconnected: ' +  socket.id);
    }
  };

  return _disconnect;
}

// On connection store the socket and newly created client
io.on('connection', function(socket) {
    console.log('Socket connected: ' + socket.id);

    socket.on('disconnect', disconnectCleanup(socket));
    socket.on('disconnectIRC', disconnectCleanup(socket));

    socket.on('connectToIRC', function(data) {
      var server   = data.server.split(':')[0],
          port     = data.server.split(':')[1] || 6667,
          channels = data.channels,
          nick     = data.nick;

      // Check for duplicate connections for client.
      exists = clients[socket.id];
      if (exists) {
        socket.emit('systemMessage', {
          type : 'error',
          msg  : 'This client is already connected!',
          when : moment()
        });
        return false;
      }

      console.log("in connect to irc", data);

      channels = channels.split(',');

      // Create IRC client
      var client = new irc.Client(
        server,
        nick,
        {
          channels   : channels,
          port       : parseInt(port, 10),
          autoConnect: false,
          autoRejoin : false,
          userName   : nick,
          realName   : nick
      });

    client.on('error', function(err) {
      // Error handling.
      console.log('IRC CLIENT ERROR: ', err);

      socket.emit('ircError', {
        msg  : err.args[1],
        when : moment(),
      });

    });

    client.on('join', function(channel, nick, message) {
      console.log('CLIENT JOINED CHANNEL:', channel);

      // Keep track of channels joined for web clients.
      var client = clients[socket.id];

      if (nick === client.nick) {
        // We want to create a channel client side if a socket user is joining.
        socket.emit('createChannel', {
          channel : channel,
        });
        if (client.channels) {
            client.channels.push(channel);
        } else {
          client.channels = [channel];
        }
      } else {
        socket.emit('ircJoin', {
          channel    : channel,
          //allChannels: clients[socket.id].channels,
          nick       : nick,
          when       : moment()
        });
      }
    });

    client.on('quit', function(nick, reason, channels, message) {
      console.log("CLIENT QUIT:", nick, channels);

      socket.emit('ircQuit', {
        nick    : nick,
        reason  : reason,
        channels: channels,
        when    : moment()
      });

    });

    client.on('part', function(channel, nick, reason, message) {
      console.log('CLIENT LEFT CHANNEL:', channel);

      // Remove from channels.
      var channels = clients[socket.id].channels;

      if (channels.indexOf(channel) !== -1) {
        channels.splice(channels.indexOf(channel), 1);
      }

      socket.emit('ircPart', {
        channel    : channel,
        allChanenls: clients[socket.id].channels,
        when       : moment()
      });

    });

    client.on('message', function(nick, to, text, message) {
      console.log('on message', nick, to, text, message);

      socket.emit('ircMessage', {
        nick   : nick,
        to     : to,
        text   : text,
        message: message,
        when   : moment()
      });

    });

    client.on('motd', function(motd) {
      socket.emit('ircMOTD', {
        when : moment(),
        motd : motd,
      });
    });

    client.on('names', function(channel, nicks) {
      console.log('names', channel, nicks);

      socket.emit('ircNames', {
        channel : channel,
        nicks   : nicks,
        when    : moment(),
      });

    });

    client.on('topic', function(channel, topic, nick, message) {
      console.log('topic', channel, topic, nick, message);

      socket.emit('ircTopic', {
        channel : channel,
        topic   : topic,
        nick    : nick,
        message : message,
        when    : moment(),
      });
    });

    client.connect(function(welcome) {
      console.log('IRC CLIENT CONNECTED FOR: ', socket.id);
      var server,
          serverMsg,
          nick;

      server     = welcome.server;
      nick       = welcome.args[0];
      serverMsg  = welcome.args[1];

      // Store client
      clients[socket.id] = {
        socket: socket,
        client: client,
        nick  : nick,
      }

      // Emit the client info to the web client.
      socket.emit('ircConnected', {
        clientsCount : Object.keys(clients).length,
        server       : server,
        serverMsg    : serverMsg,
        nick         : nick,
        when         : moment()
      });

      console.log('clients', clients);

    });

    // Handle web chat logic.
    socket.on('webMessage', function(data) {
      var channel   = data.channel,
          msg       = data.msg;

      console.log("Got message from web: " + msg);

      client.say(channel, msg);

      // TODO: process commands
      //

    });

  });

});

module.exports = httpServer
