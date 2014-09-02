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

    var user = clients[socket.id];

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

    client.on('quit', function(nick, reason, channels, message) {
      console.log("CLIENT QUIT:", nick, channels);

      var user   = clients[socket.id],
          toSend =  {
            nick     : nick,
            channels : channels,
            reason   : reason,
            when     : moment(),
          };

      // After quit, cleanup.
      if (user.nick === nick) {

        delete clients[socket.id];

        toSend.us = true;
      }

      socket.emit('ircQuit', toSend);

    });

    client.on('join', function(channel, nick, message) {
      console.log('CLIENT JOINED CHANNEL:', channel);

      var user   = clients[socket.id],
          toSend = {
            channel : channel,
            when    : moment(),
            nick    : nick
           };


      // Keep track of channels joined for web clients.
      if (user.nick === nick) {
        // We want to create a channel client side if a socket user is joining.
        if (user.channels) {
            user.channels.push(channel);
        } else {
          user.channels = [channel];
        }

        toSend.us = true;

      }

      socket.emit('ircJoin', toSend);

    });


    client.on('part', function(channel, nick, reason, message) {
      console.log('CLIENT LEFT CHANNEL:', channel, nick, reason, message);

      var user   = clients[socket.id],
          toSend = {
            channel : channel,
            when    : moment(),
            nick    : nick,
            reason  : reason || 'No reason.',
          };

      // Determine if "we've" left.
      if (user.nick === nick) {

        // Remove from channels.
        var channels = user.channels,
            idx      = channels.indexOf(channel);

        if (idx !== -1) {
            channels.splice(idx, 1);
        }

        toSend.us = true;

      } 

      // Let the client know which channel we've left.
      socket.emit('ircPart', toSend);

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
        motd : motd.split('\n'),
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
      };

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

    });

    socket.on('webCommand', function(data){
      console.log('webCommand', data);
      var channel = data.channel,
          command = data.command,
          parts   = command.split(' '),
          cmdPart = parts[0],
          cmdArgs = parts.slice(1);

      console.log('parts', parts);
      console.log('cmdPart', cmdPart);
      console.log('cmdArgs', cmdArgs);

      var cmdMapping = {
        '/join' : 'JOIN',
        '/part' : 'PART',
        '/topic': 'TOPIC',
      };

      var sendError = function(channel, msg) {
        socket.emit('commandError', {
          channel: channel,
          msg    : msg,
          when   : moment(),
        });
      };

      switch (cmdPart) {
        case '/join':
          console.log('join command');

          var newChannels = '';
          var user = clients[socket.id];
          var exists;

          for (var i = 0; i < cmdArgs.length; i++) {
            var channelName = cmdArgs[i];

            if (channelName.indexOf('#') !== 0) {
              channelName = '#' + channelName;
            }

            // Only join new channels.
            exists = channelName in user.channels;
            if (!exists) {
              newChannels += channelName +',';
            }
          }

          client.send(cmdMapping[cmdPart], newChannels);

          break;

        case '/part':
          console.log('part command');

          client.send(cmdMapping[cmdPart], channel);

          break;

        case '/topic':
          console.log('topic command');

          var newTopic = cmdArgs.join(' ');

          client.send(cmdMapping[cmdPart], channel, newTopic );

          break;

        default:
          console.log('default case?');
      }

    });

  });

});

module.exports = httpServer;
