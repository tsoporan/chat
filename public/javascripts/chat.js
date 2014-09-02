jQuery(document).ready(function($) {
  'use strict';

  var socket    = io(),
      connected = false,
      channels  = {},
      nickCache = {},
      socketNick;

  function setContainerHeight() {
    var viewHeight      = $(window).innerHeight(),
        wrapperOffset   = $('div.wrap').offset().top,
        footerHeight    = $('footer').height(),
        leftOver        = 152, // message input + paddings
        calcHeight      = viewHeight - wrapperOffset - footerHeight - leftOver;
    $('#channel-containers').css('height', calcHeight);
  }

  setContainerHeight();

  // Take care of screen resizes for chat window.
  $(window).on('resize', function() {
    setContainerHeight();
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

  function appendHTML(containers, html) {
    containers.each(function(i, el) {
      $(el).append(html);
    });
  }

  // Escape HTML from: https://github.com/janl/mustache.js/blob/master/mustache.js#L43
  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
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
    var el = $('.alert-box.' + label + ' .close');
    el.click();
  }

  function addToNames(nickObj) {
    console.log('add to names', nickObj);

    var channel        = nickObj.channel,
        nick           = nickObj.nick,
        mode           = '',
        nickHTML       = '',
        nameContainer  = $('div.channel[data-channel="' + channel + '"] div.names ul');

    nickHTML = '<li class="nick ltext" data-nick="'+ nick +'"><span class="mode">' + mode + '</span> ' + nick + '</li>';
    nameContainer.append(nickHTML);

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
    var scrollArea = $('div.channel[data-channel="' + channel + '"]');
    if (scrollArea.length > 0) {
      var scrollTop  = scrollArea[0].scrollHeight;
      scrollArea.animate({'scrollTop': scrollTop}, 'slow');
    }

  }

  // Connecting to IRC from web.
  $('form.connect').on('valid.fndtn.abide', function() {
    var server     = $('input[name=server]').val(),
        channels   = $('input[name=channels]').val(),
        socketNick = $('input[name=nickName]').val();

    socket.emit('connectToIRC', {
      server  : server,
      channels: channels,
      nick    : socketNick
    });

    $('a.close-reveal-modal').click();

    closeAlert('disconnected');
    createAlert({ msg: 'Connecting ...', level: 'warning', label: 'connecting'});

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

      msgObj.type = 'system';
      msgObj.msg  = 'Issued command: ' + msg;

    } else if (msg) {
      console.log('sending message ...', msg);
      socket.emit('webMessage', {
        channel : channel,
        msg     : msg
      });

      msgObj.type = 'user';
      msgObj.msg  = msg;
    }

    // Clear out message area.
    el.val('');

    postToChannel(msgObj);

    var cached = nickCache[socketNick];
    if (!cached) {
      nickCache[socketNick] = {
        color: 'black',
      };
    }

    return false;
  });

  socket.on('ircConnected', function(data) {
    console.log('info received', data);

    connected  = true;
    socketNick = data.nick;

    var when         = data.when,
        server       = data.server,
        serverMsg    = data.serverMsg,
        clientsCount = data.clientsCount;

    var msgObj = {
      channel : '#root',
      msg     : serverMsg,
      type    : 'system',
      when    : when,
    };

    // Hide intro content, to use later.
    $('#channel-containers div.intro').addClass('hidden');

    // Close connecting show connected.
    closeAlert('connecting');
    createAlert({ msg: 'Connected! Joining rooms ...', level: 'success', label: 'connected' });

    // Hide the connect and show the user menu.
    $('#connect').addClass('hidden');

    var menuHTML = '<a>Hi, ' + socketNick + '</a>' +
                   '<ul class="dropdown">'+
                   '<li><a id="disconnect">Disconnect</a></li>' +
                   '</ul>';
    $('.top-bar-section li.has-dropdown').append(menuHTML);

    $('#disconnect').on('click', function() {
      socket.emit('disconnectIRC');
      return false;
    });

    console.log('msgObj', msgObj);

    // Add the root channel.
    var channel     = '#root',
        channelCont = $('#channel-containers'),
        channelHTML = '<div class="channel" data-channel="' + channel + '"><div class="messages"><ul class="no-bullet"></ul></div></div>',
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
    }

    postToChannel(msgObj);

    // Show the post form.
    $('form.send').fadeIn('slow');
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
        nicks         = data.nicks,
        when          = data.when,
        nameContainer = $('div.channel[data-channel="' + channel + '"] div.names ul');

    console.log('ircNames', data);

    for (var nick in nicks) {
      var mode = nicks[nick];
      var nickHTML = '<li class="nick ltext" data-nick="' + nick + '"><span class="mode">' + mode + '</span> ' + nick + '</li>';
      nameContainer.append(nickHTML);
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

    var nick     = data.nick,
        channels = data.channels, // Channels left
        reason   = data.reason,
        when     = data.when,
        us       = data.us;

    if (us) {
      // TODO: cleanup the app

    } else {
      // Someone else quit.

      var msgObj = {
        msg     : nick + ' has quit! Reason: ' + reason,
        type    : 'system', 
        when    : when,
      };

      // Clean up presence from channels left.
      for (var i = 0; i < channels.length; i++) {
        var chan = channels[i];
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
    console.log('*** sysMessage: ', msg, type, when);
  });

  socket.on('ircError', function(data) {
    var msg  = data.msg,
        when = data.when;

    console.log('*** ircError: ', msg, when);

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

    var msgObj = {
      channel: channel,
      msg    : msg,
      when   : when,
      type   : 'error',
    };

    postToChannel(msgObj);

    console.log('*** commandError', data);
  });

  socket.on('error', function() {
    console.log('error', arguments);
  });


  $(document).foundation();
});
