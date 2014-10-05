// #chat server side logics.

var http       = require('http'),
    app        = require('./app'),
    socketio   = require('socket.io'),
    irc        = require('irc'),
    moment     = require('moment'),
    httpServer = http.Server(app),
    io         = socketio(httpServer),
    clients    = {},
    nickPool   = [],
    guestInt   = 0;


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
          when : moment(),
          label: 'alreadyconnected',
        });
        return false;
      }

      // If we don't have a nick at this point set a guest one.
      if (!nick) {
        nick = 'Guest' + guestInt;
        guestInt++;
      }
      nickPool.push(nick);

      // Account for no channels passed, in this case we just join the network.
      if (channels) {
        channels = channels.split(',');
      } else {
        channels = [];
      }

      if (channels.indexOf('main') !== -1) {
        channels.splice(channels.indexOf('main'), 1);
      }

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

      client._joiningChannels = channels;

    // Make sure we are connected in at least 15 seconds
    // or else something is wrong.
    if (client._checkConn) {
      clearTimeout(client._checkConn);
    }
    client._checkConn = setTimeout(function() {

      var user      = clients[socket.id],
          connected = user && user.connected;

      if (!connected) {
        socket.emit('systemMessage', {
          type  : 'alert',
          msg   : 'Could not connect! Check the information and try again.',
          when  : moment(),
          label : 'couldnotconnect',
        });
      }
    }, 15000);

    client.on('error', function(err) {
      // IRC error handling.
      var nick    = err.args[0],
          channel = err.args[1],
          msg     = err.args[2],
          all     = err.args;

      console.log('on error', nick, channel, msg);

      socket.emit('ircError', {
        msg     : msg,
        channel : channel,
        nick    : nick,
        all     : all,
        when    : moment(),
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

      console.log('on message', nick, to, text);

      var user   = clients[socket.id],
          toSend =  {
            nick : nick,
            to   : to,
            text : text,
            when : moment(),
          };

      if (user.nick === to) {
        // Sending a PM to us.
        toSend.us = true;
        toSend.to = nick;
      }

      // Messages sent in IRC are relayed to the client.
      socket.emit('ircMessage', toSend);

    });

    client.on('nick', function(oldNick, newNick, channels, message) {

      var user   = clients[socket.id],
          toSend = {
            oldNick : oldNick,
            newNick : newNick,
            channels: channels,
            when    : moment(),
          };

      // Change our nick reference.
      if (user.nick === oldNick) {
          clients[socket.id].nick = newNick;

          toSend.us = true;
      }

      // Send the new nick change.
      socket.emit('ircNick', toSend);

    });

    client.on('motd', function(motd) {

      // Send the message of the day.
      socket.emit('ircMOTD', {
        when : moment(),
        motd : motd,
      });
    });

    client.on('names', function(channel, nicks) {

      var mods = [],
          users= [];

      for (var nick in nicks) {
        if (nicks[nick]) {// has mode
          mods.push([nick, nicks[nick]]);
        } else {
          users.push(nick);
        }
      }

      var symbolWeights = { '~': 1, '&': 2, '@': 3, '%': 4, '+': 5 };

      // Sort modded.
      mods.sort(function(a, b) {
        return symbolWeights[a[1]] - symbolWeights[b[1]];
      });

      // Sort users
      users.sort(function(a, b) {
        return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
      });

      // Send a list of nicks in channel.
      socket.emit('ircNames', {
        channel : channel,
        mods    : mods,
        users   : users,
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
      // console.log('*** RAW MESSAGE: ', message);

      // Handle PRIVMSG actions since 'message' doesn't catch them.
      var rawCommand = message.rawCommand,
          nick       = message.nick,
          target,
          msg,
          text,
          toSend;

      if (rawCommand === 'PRIVMSG') {
        target = message.args[0];
        msg    = message.args[1];

        if (target && msg) {
          if (msg.indexOf('\u0001ACTION') === 0) {
            // This is an action.
            text = msg.split('\u0001')[1].split('ACTION')[1].trim(); // Get just the text portion.

            toSend = {
              nick : nick,
              to   : target.indexOf('#') === 0 ? target : '@' + nick,
              text : text,
              when : moment(),
              type : 'action'
            };

            socket.emit('ircMessage', toSend);
          }
        }

      }

    });

    client.connect(function(welcome) {

      console.log('welcome', welcome);

      var serverMsg,
          nick;

      nick       = welcome.args[0];
      serverMsg  = welcome.args[1];

      // Store client
      clients[socket.id] = {
        socket   : socket,
        client   : client,
        nick     : nick,
        channels : [],
        connected: true,
      };

      // Emit the client info to the web client.
      socket.emit('ircConnected', {
        clientsCount : Object.keys(clients).length,
        server       : server,
        port         : port,
        serverMsg    : serverMsg,
        nick         : nick,
        when         : moment(),
        channels     : client._joiningChannels,
      });

    });

    // Handle web chat logic.
    socket.on('webMessage', function(data) {
      var target    = data.target,
          msg       = data.msg,
          pm        = data.pm;

      console.log('on webmessage', data);

      // Say in IRC.
      if ( target !== 'main' ) { // The main window will not exist as a channel.
        client.say(target, msg);
      }

    });

    socket.on('webCommand', function(data){

      var channel = data.target, // Channel or nick
          command = data.command,
          parts   = command.split(' '),
          cmdPart = parts[0],
          cmdArgs = parts.slice(1);


      var doJoin = function doJoin() {

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

        client.send('JOIN', newChannels);

      };

      var doPart = function doPart() {

        var reason = cmdArgs.join(' ');

        if (channel.indexOf('#') === 0) { // Can only part channels
          client.send('PART', channel, reason);
        } else { // Handle leaving of PM
          var user   = clients[socket.id],
            toSend = {
              channel : '@' + channel, // PM
              us      : true,
            };

          // Let the client know which channel we've left.
          socket.emit('ircPart', toSend);

        }

      };

      var doTopic = function doTopic() {

        var newTopic = cmdArgs.join(' ');

        client.send('TOPIC', channel, newTopic );


      };

      var doQuit = function doQuit() {

        var reason = cmdArgs.join(' ');

        client.disconnect(reason, function() {

          // Clean up.
          delete clients[socket.id];

          socket.emit('ircQuit', {
            us : true,
          });

          if (client._checkConn) {
            clearTimeout(client._checkConn);
          }

        });

      };

      var doNick = function doNick() {

        var newNick = cmdArgs.join('_');

        client.send('NICK', newNick);

      };

      var doMsg = function doMsg(opts) {
        opts       = opts || {};

        var to     = opts.to || cmdArgs[0],
            msg    = opts.msg || cmdArgs.slice(1).join(' '),
            us     = opts.hasOwnProperty('us') ? opts.us :  true,
            safe   = opts.safe,
            action = opts.action,
            type   = opts.type;

        if (to !== 'main') {
          client.send('PRIVMSG', to, msg);
        }

        var user = clients[socket.id],
          toSend =  {
            to   : to,
            nick : user.nick,
            text : action || msg,
            when : moment(),
            type : type,
            safe : safe,
            us   : us,
          };

        // Messages sent in IRC are relayed to the client.
        socket.emit('ircMessage', toSend);

      };

      var doAction = function doAction() {
        var action = cmdArgs.join(' '),
            msg = '\u0001ACTION ' + action + '\u0001';

        doMsg({
          action : action,
          msg    : msg,
          type   : 'action',
          to     : channel
        });

      };

      var doHelp = function doHelp() {
          var msg  = 'These are the available commands:\n';

          for (var key in cmdMapping) {
            msg += '- ' + key + ' : ' + cmdMapping[key].helpText + '\n';
          }

          doMsg({
            msg : msg,
            to  : 'main',
            type: 'system',
            us  : false,
            safe: true,
          });

      };

      var cmdMapping = {
        '/join' : { func: doJoin,   helpText: 'Join a channel, takes a channel argument. ex: /join #somechannel'},
        '/j'    : { func: doJoin,   helpText: 'Short hand for /join'},
        '/part' : { func: doPart,   helpText: 'Parts the current channel, takes an optional reason argument. ex: /part no more love to give'},
        '/p'    : { func: doPart,   helpText: 'Short hand for /part'},
        '/topic': { func: doTopic,  helpText: 'Changes the channel topic, takes an argument. ex: /topic i like unicorns'},
        '/t'    : { func: doTopic,  helpText: 'Short hand for /topic'},
        '/quit' : { func: doQuit,   helpText: 'Quits. Everything. Takes an optional reason argument. ex: /quit self destruct'},
        '/q'    : { func: doQuit,   helpText: 'Short hand for /quit'},
        '/nick' : { func: doNick,   helpText: 'Changes your nick, takes one argument. ex: /nick ZeroCool'},
        '/n'    : { func: doNick,   helpText: 'Short hand for /nick'},
        '/msg'  : { func: doMsg,    helpText: 'Sends a private message to channel or person, takes two arguments target and message. ex: /msg ZeroCool seriously? change your name!'},
        '/m'    : { func: doMsg,    helpText: 'Short hand for /msg'},
        '/me'   : { func: doAction, helpText: 'Do an action! Takes an argument. ex: /me slaps ZeroCool'},
        '/help' : { func: doHelp,   helpText: 'Fire - exclamation mark. Fire - exclamation mark. Help me - exclamation mark.'},
      };

      var sendError = function(channel, msg) {
        socket.emit('commandError', {
          channel: channel,
          msg    : msg,
          when   : moment(),
        });
      };

      if (cmdPart in cmdMapping) {
        return cmdMapping[cmdPart].func();
      } else {
        return sendError(channel, 'Command "' + cmdPart + '" is not recognized.');
      }

    });

  });

});

module.exports = httpServer;
