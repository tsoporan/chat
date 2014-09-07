jQuery(document).ready(function($) {
  'use strict';

  var socket    = io(),
      connected = false,
      channels  = {},
      nickCache = {},
      socketNick;

  // Startswith functionality for String.
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) === 0;
  };

  function setContainerHeight(channel) {
    var windowHeight = $(window).height(),
        headerHeight = $('.top-bar').height(),
        extraPadding = 80,
        wrapper      = $('div.wrap'),
        messages     = $('div.channel[data-channel="'+channel+'"] .messages'),
        names        = $('div.channel[data-channel="'+channel+'"] .names');

    wrapper.height(windowHeight - headerHeight - extraPadding);

    // Set message/name height to account for the send form and padding.
    messages.height(wrapper.height() - 150);
    names.height(wrapper.height() - 150);
  }

  // Take care of screen resizes for chat window.
  $(window).on('resize', function() {
    setContainerHeight(window.location.hash);
  });

  // Switch channel on hash change.
  $(window).on('hashchange', function() {
    var channel = location.hash || '#root';

    var channelEl = $('div[data-channel="' + channel + '"]');

    if (channelEl.length > 0) {

      // Remove selected state on anchors.
      $('a.channelLink').removeClass('selected');

      // Hide all other channels.
      $('#channel-containers div.channel').removeClass('hidden').addClass('hidden');

      // Select current channel.
      $('li[data-channel="'+ channel +'"] .channelLink').addClass('selected');

      // Show current channel.
      channelEl.removeClass('hidden');

    }
  });

  // Handle predefined networks.
  $('.popular-networks li div').on('click', function(e) {
    if (e) {
      e.preventDefault();
    }

    var networkLookup = {
      'hashbang': function() {
        connectToIRC({
          server : 'irc.hashbang.sh:7777',
          channels: '#!',
        });
      },
      'freenode': function() {
        connectToIRC({
          server: 'irc.freenode.net',
        });
      },
      'quakenet': function() {
        connectToIRC({
          server: 'irc.quakenet.org',
        });
      },
      'efnet'   : function() {
        connectToIRC({
          server: 'irc.efnet.org',
        });
      },
    };

    var network = $(this).text();

    if (network in networkLookup) {
      return networkLookup[network]();
    }

    return false;
  });


  function appendHTML(containers, html) {
    containers.each(function(i, el) {
      $(el).append(html);
    });
  }

  // Escape HTML from: https://github.com/janl/mustache.js/blob/master/mustache.js#L43
  var entityMap = {
    '&' : '&amp;',
    '<' : '&lt;',
    '>' : '&gt;',
    '"' : '&quot;',
    '\'': '&#39;',
    '/' : '&#x2F;'
  };

  function escapeHTML(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  function getColor() {

      // Black reserved for current user.
      var colors  = [
        'blue',
        'green',
        'red',
        'brown',
        'purple',
        'orange',
        'yellow',
        'light_green',
        'teal',
        'light_cyan',
        'light_blue',
        'pink',
        'grey',
        'light_grey'
      ];

      // Return a randomized color.
      return colors[Math.floor(Math.random() * (colors.length - 1))];

  }

  function createAlert(opts) {
    console.log('creating Alert', opts);
    var msg       = opts.msg,
        level     = opts.level,
        label     = opts.label,
        container = $('.alert-container'),
        html;

    html = '<div data-alert class="alert-box ctext radius ' + level + ' ' + label + '">' +
           '<span class="alert-text">' + msg + '</span>' +
           '<a class="close">&times;</a>' +
           '</div>';

    container.append(html).foundation();

    $('.alert-box.' + label).show();
  }

  function closeAlert(label) {
    if (label) {
      var el = $('.alert-box.' + label + ' .close');
      el.click();
    } else { // Close all.
      var els = $('.alert-box .close');
      els.each(function(i, el) {
        el.click();
      });
    }
  }

  function addToNames(nickObj) {
    console.log('add to names', nickObj);

    var channel        = nickObj.channel,
        nick           = nickObj.nick,
        mode           = '',
        nickHTML       = '',
        nameContainer  = $('div.channel[data-channel="' + channel + '"] div.names ul');

    nickHTML = '<li class="nick ltext" data-nick="'+ nick +'"><span class="mode">' + mode + '</span> <span class="nick-text">' + nick + '</span></li>';
    nameContainer.append(nickHTML);

  }

  function changeName(nickObj) {
    var channel        = nickObj.channel,
        oldNick        = nickObj.oldNick,
        nick           = nickObj.nick,
        nameContainer  = $('div.channel[data-channel="' + channel + '"] div.names ul'),
        exists         = nameContainer.find('li[data-nick="'+ oldNick +'"]');

    if (exists.length) {
      exists.attr('data-nick', nick);
      exists.find('.nick-text').text(nick);
    }

  }

  function removeFromNames(nickObj) {
    console.log('remove from names', nickObj);

    var channel        = nickObj.channel,
        nick           = nickObj.nick,
        nameContainer  = $('div.channel[data-channel="' + channel + '"] div.names ul'),
        exists;

    exists = nameContainer.find('.nick[data-nick="'+ nick +'"]');

    if (exists.length) {
      exists.remove();
    }

  }

  function nameComplete(word, channel) {
    // Complete based on the names we have in this channel.

    var namesEls = $('#channel-containers div.channel[data-channel="' + channel + '"] div.names ul li'),
        names    = [];

    word = word[0].toLowerCase();

    if (namesEls.length) {
      namesEls.each(function(i, el) {
        var nameText = $(el).attr('data-nick').toLowerCase();

        console.log('nameText', nameText);

        names.push(nameText);
      });
    }

    if (names.length) {
      for (var i = 0; i < names.length; i++) {
        var name = names[i];

        // Check if the word matches the  beginning of the nick, as soon
        // as a match is found return it.
        if (name.startsWith(word)) {
          return name;
        }
      }

    }

    return false;
  }

  function postToChannel(msgObj) {

    console.log('post to channel', msgObj);

    var channel    = msgObj.channel,
        nick       = msgObj.nick,
        msg        = msgObj.msg,
        type       = msgObj.type,
        when       = (msgObj.when ? moment(msgObj.when).format('YYYY-MM-DD h:mm:ss') : undefined),
        color      = 'none',
        msgArray   = Array.isArray(msg),
        html       = '',
        hilited,
        chanMsgs,
        containers,
        m;

    if (nickCache[nick]) {
      color = nickCache[nick].color;
    }

    if (!connected) {
      // Send error to all channels.
      msg  = 'You are no longer connected! Please connect to send messages!';
      type = 'error';
    }

    // Use this channel to send.
    if (channel) {

      var exists = channel in channels;

      if (!exists) {
        channels[channel] = {};
      }

      // Keep a copy of message.
      chanMsgs = channels[channel].messages;
      if (chanMsgs) {
         channels[channel].messages.push(msgObj);
      } else {
         channels[channel].messages = [msgObj];
      }

      containers = $('#channel-containers div[data-channel="' + channel + '"] div.messages ul');

    } else { // If no channel is provided send to all channels.
      containers = $('#channel-containers div.messages ul');
    }

    switch (type) {
      case 'system':

        if (msgArray) {
          for (var i = 0; i < msg.length; i++) {
            m = escapeHTML(msg[i]);
            if (m) {
              html += '<li class="message system_msg"><span class="timestamp">' + when + '</span>' + m + '</li>';
            }
          }
        } else {
          m = escapeHTML(msg);
          html = '<li class="message system_msg"><span class="timestamp">' + when + '</span>' + m + '</li>';
        }
        appendHTML(containers, html);

        break;

      case 'user':

        hilited = (msg.indexOf(socketNick) !== -1 && nick !== socketNick) ? 'hilited' : '';

        if (msgArray) {
          for (var j = 0; j < msg.length; j++) {
            m = escapeHTML(msg[j]);
            if (m) {
              html += '<li class="message '+ type + ' '+ hilited + '" data-to="' + channel +  '">' +
                     '<span class="timestamp">' + when + '</span>' +
                     '<span class="nick color_'+ color + '">' + nick + '</span>: <span class="text">' + m + '</span></li>';
            }
          }
        } else {
          m = escapeHTML(msg);
          html = '<li class="message '+ type + ' '+ hilited + '" data-to="' + channel +  '">' +
                 '<span class="timestamp">' + when + '</span>' +
                 '<span class="nick color_'+ color + '">' + nick + '</span>: <span class="text">' + m + '</span></li>';
        }
        appendHTML(containers, html);

        break;

      case 'error':
          m = escapeHTML(msg);
          html = '<li class="message error"><span class="timestamp">' + when + '</span>' + m + '</li>';

          appendHTML(containers, html);

          break;

      default:
        // Do nothing.
        break;
    }

    // Keep scroll at bottom of channel window.
    var scrollArea = $('div.channel[data-channel="' + channel + '"] .messages');
    if (scrollArea.length > 0) {
      var scrollTop  = scrollArea[0].scrollHeight;
      scrollArea.animate({'scrollTop': scrollTop}, 'slow');
    }

  }

  function connectToIRC(opts) {
    socket.emit('connectToIRC', opts);
    closeAlert('disconnected');
    createAlert({ msg: 'Connecting to '+ opts.server + ' ...', level: 'warning', label: 'connecting'});
  }

  // Connecting to IRC from web.
  $('form.connect').on('valid.fndtn.abide', function() {
    var server     = $('input[name=server]').val(),
        channels   = $('input[name=channels]').val(),
        socketNick = $('input[name=nickName]').val();

    $('a.close-reveal-modal').click();

    connectToIRC({
      server  : server,
      channels: channels,
      nick    : socketNick
    });

    return false;
  });

  // Sending message from web.
  $('form.send').submit(function(e) {
    if (e) { e.preventDefault(); }

    var el  = $('input[name=message]');
    var val = el.val();

    // Get the channel from the URL
    var channel   = location.hash || '#root';
    var msg       = val;
    var isCommand = msg.indexOf('/') === 0;

    var msgObj = {
      nick    : socketNick,
      when    : moment(),
      channel : channel,
    };

    if (isCommand) {
      console.log('sending command ...', msg);
      socket.emit('webCommand', {
          channel: channel,
          command: msg,
      });
    } else if (msg) {
      console.log('sending message ...', msg);
      socket.emit('webMessage', {
        channel : channel,
        msg     : msg
      });

      msgObj.type = 'user';
      msgObj.msg  = msg;

      postToChannel(msgObj);
    }

    // Clear out message area.
    el.val('');

    var cached = nickCache[socketNick];
    if (!cached) {
      nickCache[socketNick] = {
        color: 'black',
      };
    }

    return false;
  });

  // Hijack tab behaviour.
  $('form.send').on('keydown', function(e) {
    var keyCode = e.keyCode || e.which,
        inputEl = $('form.send input[name=message]'),
        val     = inputEl.val();

    if (keyCode === 9) {
      e.preventDefault();

      // A value exists and the last character is not a space, try to autocomplete.
      if (val && val[val.length-1] !== " ") {

        var channel = window.location.hash,
            word    = val.split(' ').slice(-1), // We only want the last word to autocomplete.
            match   = nameComplete(word, channel);

        if (match) {
          // Plug in the value.
          var newVal = val.split(' ').slice(0, -1).join(' ') + ' ' +  match + ' ';
          inputEl.val(newVal);
        }
      }
    }
  });

  socket.on('ircConnected', function(data) {
    console.log('info received', data);

    connected  = true;
    socketNick = data.nick;

    var when         = data.when,
        server       = data.server,
        serverMsg    = data.serverMsg,
        clientsCount = data.clientsCount,
        gotChannels  = data.channels.length;

    var msgObj = {
      channel : '#root',
      msg     : serverMsg,
      type    : 'system',
      when    : when,
    };

    // Hide intro content, to use later.
    $('#channel-containers div.intro').fadeOut(200);

    // Close connecting show connected.
    closeAlert('connecting');

    if (gotChannels) {
      createAlert({ msg: 'Connected! Joining rooms ...', level: 'success', label: 'connected' });
    }

    // Hide the connect and show the user menu.
    $('#connect').addClass('hidden');

    var menuHTML = '<a>Hi, <span class="menu-nick bold">' + socketNick + '</span></a>' +
                   '<ul class="dropdown">'+
                   '<li><a id="disconnect">Disconnect</a></li>' +
                   '</ul>';
    $('.top-bar-section li.has-dropdown').append(menuHTML);

    $('#disconnect').on('click', function() {
      socket.emit('webCommand', {
        command : '/quit',
      });
      return false;
    });

    console.log('msgObj', msgObj);

    // Add the root channel.
    var channel     = '#root',
        channelCont = $('#channel-containers'),
        channelHTML = '<div class="channel" data-channel="' + channel + '">' +
                        '<div class="messages">' +
                          '<ul class="no-bullet"></ul>' +
                        '</div>' +
                      '</div>',
        channelList = $('#channel-list'),
        linkHTML    = '<li data-channel="'+ channel +'" class="channel">' +
                      '<a href="' + channel  +'" class="channelLink button tiny radius">' + channel + '</a>' +
                      '</li>';

    // Check for existing loaded UI, and continue from there.
    var existingChannelLink = channelList.find('li[data-channel="' + channel + '"]').length;
    if (!existingChannelLink) {
      channelList.append(linkHTML);
    }

    var existingChannel =  channelCont.find('div[data-channel="' + channel + '"]').length;
    if (!existingChannel) {
      channelCont.append(channelHTML);
      setContainerHeight(channel);
    }

    postToChannel(msgObj);

    // Show the post form.
    $('form.send').fadeIn('slow', function() {
    });

  });

  socket.on('ircMOTD', function(data) {
    console.log('ircMOTD', data);
    var motd = data.motd,
        when = data.when;

    var msgObj = {
      channel : '#root',
      msg     : motd,
      type    : 'system',
      when    : when,
    };

    postToChannel(msgObj);

  });

  socket.on('ircMessage', function(data) {
    var channel = data.to,
        msg     = data.text,
        nick    = data.nick,
        when    = data.when;

    console.log('message received', data);

    var msgObj  = {
      msg       : msg,
      nick      : nick,
      when      : when,
      channel   : channel,
      type      : 'user',
    };

    var cached = nick in nickCache;
    if (!cached) {
      nickCache[nick] = {
        color: getColor(),
      };
    }

    postToChannel(msgObj);

    console.log('channel messages', channels[channel].messages);

  });

  socket.on('ircNames', function(data) {
    var channel       = data.channel,
        mods          = data.mods,
        users         = data.users,
        when          = data.when,
        nameContainer = $('div.channel[data-channel="' + channel + '"] div.names ul'),
        nickHTML,
        nick,
        mode;

    // Show modded nicks first.
    for (var i in mods) {
      nick = mods[i][0];
      mode = mods[i][1];

      nickHTML = '<li class="nick ltext" data-nick="' + nick + '"><span class="mode">' + mode + '</span> <span class="nick-text">' + nick + '</span></li>';
      nameContainer.append(nickHTML);
    }

    // Show remaining users under modded nicks.
    for (var j in users) {
      nick = users[j];
      mode = '';

      nickHTML = '<li class="nick ltext" data-nick="' + nick + '"><span class="mode">' + mode + '</span> <span class="nick-text">' + nick + '</span></li>';
      nameContainer.append(nickHTML);
    }

  });


  socket.on('ircNick', function(data) {
    console.log('ircNick', data);

    var oldNick  = data.oldNick,
        newNick  = data.newNick,
        channels = data.channels,
        us       = data.us,
        when     = data.when;


    if (us) {
      socketNick = newNick;
      $('.menu-nick').text(newNick);
    }

    var msgObj = {
      msg : oldNick + ' changed their name to: ' + newNick,
      type: 'system',
      when: when
    };

    if (channels.length) {
      $.each(channels, function(i, channel) {
        msgObj.channel = channel;
        changeName({ channel: channel, oldNick: oldNick, nick: newNick });
        postToChannel(msgObj);

      });
    } else {
      postToChannel(msgObj); // Post to root window.
    }

  });

  socket.on('ircTopic', function(data) {
    var channel        = data.channel,
        topic          = data.topic,
        nick           = data.nick,
        when           = data.when,
        rawMsg         = data.message,
        topicContainer = $('div.channel[data-channel="'+ channel +'"] div.topic span');

    console.log('ircTopic', data);
    topicContainer.empty();
    topicContainer.append(topic);

    if (rawMsg.command === 'TOPIC') { // User called
      var msgObj = {
        channel: channel,
        msg    : nick + ' changed the topic to: ' + topic,
        type   : 'system',
        when   : when,
      };

      postToChannel(msgObj);
    }
  });


  socket.on('ircJoin', function(data) {
    console.log('ircJoin', data);

    closeAlert('connected');

    var channel   = data.channel,
        nick      = data.nick,
        msg       = nick  + ' has joined channel: ' + channel,
        when      = data.when,
        us        = data.us;

    if (us) {

      // If we're joining check/create UI.

      var channelList      = $('#channel-list'),
          linkHTML         = '<li data-channel="'+ channel +'" class="channel">' +
                             '<a href="' + channel  +'" class="channelLink button tiny radius">' + channel + '</a>' +
                             '</li>',
          channelCont      = $('#channel-containers'),
          channelHTML      = '<div class="channel hidden row" data-channel="' + channel + '">'+
                             '<div class="topic">Topic: <span></span></div>' +
                             '<div class="small-9 columns messages">' +
                             '<ul class="no-bullet"></ul>' +
                             '</div>' +
                             '<div class="small-3 columns names">' +
                             '<ul class="no-bullet"></ul>' +
                             '</div>' +
                             '</div>';

      // Check for existing loaded UI, and continue from there.
      var existingChannelLink = channelList.find('li[data-channel="' + channel + '"]');
      if (!existingChannelLink.length) {
        channelList.append(linkHTML);
      }

      var existingChannel = channelCont.find('div[data-channel="' + channel + '"]').length;
      if (!existingChannel) {
        channelCont.append(channelHTML);
        setContainerHeight(channel);
      }
      if (window.location.hash === channel) {
        existingChannelLink.removeClass('selected').addClass('selected');
      } else {
        window.location.hash = channel;
      }


    } else {

      // Someone else has joined.

      var msgObj = {
        channel : channel,
        nick    : nick,
        msg     : msg,
        type    : 'system',
        when    : when,
      };

      addToNames({ nick: nick, channel: channel });
      postToChannel(msgObj);

   }

  });

  socket.on('ircPart', function(data) {
    console.log('ircPart', data);

    var channel = data.channel,
        when    = data.when,
        us      = data.us,
        nick    = data.nick,
        reason  = data.reason;

    if (us) {
      // Remove local copy.
      if (channel in channels) {
        delete channels[channel];
        console.log('removed channel from local', channels);
      }

      // Remove UI els.
      var channelListEl = $('#channel-list li[data-channel="' + channel + '"]');
      channelListEl.fadeOut(400, function() {

        channelListEl.remove();

        var channelContEl = $('#channel-containers div[data-channel="' + channel + '"]');

        channelContEl.fadeOut(400, function() {

          channelContEl.remove();

          // Unhide root window.
          $('#channel-containers div[data-channel="#root"]').removeClass('hidden');

          // Move back to root channel.
          window.location.hash = '#root';

        });

      });
    } else {
      // Someone else left the room. Clear their name from the names.

      var msgObj = {
        channel : channel,
        msg     : nick + ' has left the room! Reason: ' + reason,
        type    : 'system',
        when    : when,
      };

      removeFromNames({ channel: channel, nick: nick });

      postToChannel(msgObj);
    }


  });

  socket.on('ircQuit', function(data) {
    console.log('ircQuit', data);

    var nick         = data.nick,
        leftChannels = data.channels, // Channels left
        reason       = data.reason,
        when         = data.when,
        us           = data.us;

    if (us) {
      // Clear out UI and set back to intro.
      var channelListItems = $('#channel-list li');
      var channelItems     = $('#channel-containers .channel');
      channelListItems.fadeOut(function() {
        // Remove channel list.
        channelListItems.remove();

        // Remove channels
        channelItems.fadeOut(function() {

          channelItems.remove();

          // Reset other UI els.
          $('form.send').fadeOut();

          // Reset other UI els.
          $('div.intro').fadeIn();

          $('li.has-dropdown').empty();
          $('a#connect').removeClass('hidden');

        });

      });

      // Reset globs.
      channels   = {};
      nickCache  = {};
      connected  = false;
      socketNick = null;

      window.location.hash = '#';

    } else {
      // Someone else quit.

      var msgObj = {
        msg     : nick + ' has quit! Reason: ' + reason,
        type    : 'system',
        when    : when,
      };

      // Clean up presence from channels left.
      for (var i = 0; i < leftChannels.length; i++) {
        var chan = leftChannels[i];
        msgObj.channel = chan;
        removeFromNames({ channel: chan, nick: nick });
        postToChannel(msgObj);
      }

    }

  });

  socket.on('ircDisconnected', function(data) {
    console.log('disconnect received');
    connected = false;

    var when = data.when;

    var msgObj = {
      msg  : 'You were disconnected!',
      type : 'system',
      when : when,
    };

    postToChannel(msgObj);

    createAlert({ msg: 'Disconnected! Reconnect to continue chatting.', level : 'alert', label: 'disconnected' });

    // Remove user menu and show connect.
    $('li.has-dropdown').empty();
    $('#connect').removeClass('hidden');

    // Empty names sidebar.
    $('div.names ul').empty();

  });

  socket.on('systemMessage', function(data) {
    var msg  = data.msg,
        type = data.type,
        when = data.when;

    console.log('*** sysMessage: ', data);

    closeAlert();
    createAlert({
      msg   : msg,
      level : type,
      label : 'couldnotconnect',
    });

  });

  socket.on('ircError', function(data) {
    var msg     = data.msg,
        channel = data.channel,
        nick    = data.nick,
        all     = data.all,
        when    = data.when;

    console.log('*** ircError : ', data);

    var msgObj =  {
      msg  : msg,
      when : when,
      type : 'error',
    };

    postToChannel(msgObj);

  });

  socket.on('commandError', function(data) {
    var channel = data.channel,
        msg     = data.msg,
        when    = data.when;

    console.log('*** commandError :', data);

    var msgObj = {
      channel: channel,
      msg    : msg,
      when   : when,
      type   : 'error',
    };

    postToChannel(msgObj);

  });

  // Handle socket connect/reconnect/disconnects.
  socket.on('connect', function() {
    console.log(' ** socket connected', arguments);
  });
  socket.on('error', function() {
    console.log(' ** socket error', arguments);
  });
  socket.on('disconnect', function() {
    console.log(' ** socket disconnect', arguments);
  });
  socket.on('reconnect', function() {
    console.log(' ** socket reconnect', arguments);
  });
  socket.on('reconnect_attempt', function() {
    console.log(' ** socket reconnect attempt', arguments);
  });
  socket.on('reconnecting', function() {
    console.log(' ** socket reconnecting', arguments);
  });
  socket.on('reconnect_error', function() {
    console.log(' ** socket reconnect error', arguments);
  });
  socket.on('reconnect_failed', function() {
    console.log(' ** socket reconnect failed', arguments);
  });

  $(document).foundation();
});
