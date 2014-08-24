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

    var user = clients[socket.nick];

    if (user && user.client) {
      user.client.disconnect(function() {
        socket.emit('ircDisconnected', {
          when : moment()
        });
      });

      delete clients[socket.nick];
      console.log('User disconnected: ' +  socket.nick);
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
    });

    client.on('join', function(channel, nick, message) {
      console.log('CLIENT JOINED CHANNEL:', channel);

      // Keep track of channels joined for web clients.
      var client = clients[nick];

      if (client) {
        // We want to create a channel client side if we're the ones joining.
        socket.emit('createChannel', {
          channel : channel,
        });
        if (clients[nick].channels) {
            clients[nick].channels.push(channel);
        } else {
          clients[nick].channels = [channel];
        }
      }

      socket.emit('ircJoin', {
        channel    : channel,
        //allChannels: clients[socket.id].channels,
        nick       : nick,
        when       : moment()
      });
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

    client.connect(function(welcome) {
      console.log('IRC CLIENT CONNECTED FOR: ', socket.id);
      var server,
          serverMsg,
          nick;

      server     = welcome.server;
      nick       = welcome.args[0];
      serverMsg  = welcome.args[1];

      // Store client
      clients[client.opt.nick] = {
        socket: socket,
        client: client,
      }

      socket.nick = client.opt.nick;

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
