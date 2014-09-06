// #chat server side logics.

var http       = require('http'),
    app        = require('./app'),
    socketio   = require('socket.io'),
    irc        = require('irc'),
    moment     = require('moment'),
    httpServer = http.Server(app),
    io         = socketio(httpServer),
    connected  = false,
    clients    = {};


// On connection store the socket and newly created client
io.on('connection', function(socket) {
    console.log('Socket connected: ' + socket.id);

    socket.on('disconnect', function() {
      console.log('*** socket disconnect', arguments);

      // Clean up.
      var user = clients[socket.id];
      if (user && user.client) {
        user.client.disconnect(function() {
          console.log('client disconnected for: ', user.nick);
        });
      }

      delete clients[socket.id];

    });

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

    // Make sure we are connected in at least 10 seconds
    // or else something is wrong.
    setTimeout(function() {
      if (!connected) {
        socket.emit('systemMessage', {
          type: 'alert',
          msg : 'Could not connect! Check the information and try again.',
          when: moment(),
        });
      }
    }, 10000);

    client.on('error', function(err) {
      // IRC error handling.
      socket.emit('ircError', {
        msg  : err.args[1],
        when : moment(),
      });

    });

    client.on('quit', function(nick, reason, channels, message) {

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

      // Messages sent in IRC are relayed to the client.
      socket.emit('ircMessage', {
        nick   : nick,
        to     : to,
        text   : text,
        message: message,
        when   : moment()
      });

    });

    client.on('motd', function(motd) {

      // Send the message of the day.
      socket.emit('ircMOTD', {
        when : moment(),
        motd : motd.split('\n'),
      });
    });

    client.on('names', function(channel, nicks) {

      // Send a list of nicks in channel.
      socket.emit('ircNames', {
        channel : channel,
        nicks   : nicks,
        when    : moment(),
      });

    });

    client.on('topic', function(channel, topic, nick, message) {

      // Send the current IRC topic.
      socket.emit('ircTopic', {
        channel : channel,
        topic   : topic,
        nick    : nick,
        message : message,
        when    : moment(),
      });
    });

    client.on('raw', function(message) {
      //console.log('*** RAW MESSAGE: ', message);
    });

    client.connect(function(welcome) {

      var server,
          serverMsg,
          nick;

      connected  = true;
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

    });

    // Handle web chat logic.
    socket.on('webMessage', function(data) {
      var channel   = data.channel,
          msg       = data.msg;

      // Say in IRC.
      client.say(channel, msg);

    });

    socket.on('webCommand', function(data){

      var channel = data.channel,
          command = data.command,
          parts   = command.split(' '),
          cmdPart = parts[0],
          cmdArgs = parts.slice(1);

      var cmdMapping = {
        '/join' : 'JOIN',
        '/part' : 'PART',
        '/topic': 'TOPIC',
        '/quit' : 'QUIT',
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

          client.send(cmdMapping[cmdPart], channel);

          break;

        case '/quit':

          var reason = cmdArgs.join(' ');

          client.disconnect(reason, function() {

            // Clean up.
            delete clients[socket.id];

            socket.emit('ircQuit', {
              us : true,
            });
          });

          break;

        case '/topic':

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
