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

  function setContainerHeight(opts) {

    var state   = opts.state,
        channel = opts.channel;

    // If no channel provided try to get it from the URL.
    if (!channel) {
      channel = (state && state.channel) ? state.channel : false;
    }

    if (channel) {
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
  }

  // Handle accidentally closing.
  $(window).on('beforeunload', function() {
    return 'Leaving this page will disconnect you from chat!';
  });

  // Take care of screen resizes for chat window.
  $(window).on('resize', function() {
    setContainerHeight({ state : history.state });
  });

  // Listen for changes to the URL
  $(window).on('pathchange', function() {

    var channel;

    if (!history.state) {
      return;
    }

    if (history.state.root) {
      channel = 'main';
    } else {
      channel = history.state.channel;
    }

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

      // Update notifications to read.
      updateNotifications(channel, 'read');

      // Set focus to typing area.
      $('input[name=message]').focus();
    }
  });

  // Listen to HTML5 popstate
  $(window).on('popstate', function() {
    $(window).trigger('pathchange');
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
  };

  function escapeHTML(string) {
    return String(string).replace(/[&<>"']/g, function (s) {
      return entityMap[s];
    });
  }

  function getColor() {

      // White reserved for current user.
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
        //'grey',
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

    var channel        = nickObj.channel,
        nick           = nickObj.nick,
        mode           = '',
        nickHTML       = '',
        nameContainer  = $('div.channel[data-channel="' + channel + '"] div.names ul'),
        numContainer   = $('div.channel[data-channel="' + channel + '"] div.names ul li.names-count .num'),
        namesCount     = parseInt(numContainer.text(), 10),
        newCount       = ++namesCount;

    nickHTML = '<li class="nick ltext" data-nick="'+ nick +'"><span class="mode">' + mode + '</span> <span class="nick-text">' + nick + '</span></li>';
    nameContainer.append(nickHTML);

    // Update counts.
    numContainer.text(newCount);

  }

  function changeName(opts) {
    var channels = opts.channels,
        oldNick  = opts.oldNick,
        newNick  = opts.newNick,
        when     = opts.when,
        us       = opts.us,
        nameContainer,
        exists;

    var msgObj = {
      msg : oldNick + ' changed their name to: ' + newNick,
      type: 'system',
      when: when
    };

    if (us) {
      socketNick = newNick;
      $('.menu-nick').text(newNick);
    }

    if (channels.length) {
      $.each(channels, function(i, channel) {

        msgObj.channel = channel;

        // Find all name containers for channel and change the names.
        nameContainer = $('div.channel[data-channel="' + channel + '"] div.names ul');
        exists        = nameContainer.find('li[data-nick="' + oldNick + '"]');

        if (exists.length) {
          exists.attr('data-nick', newNick);
          exists.find('.nick-text').text(newNick);
        }

        // Notify channel.
        postToChannel(msgObj);

      });
    } else {
      // Notify main channel.
      postToChannel(msgObj);
    }

  }

  function removeFromNames(nickObj) {

    var channel        = nickObj.channel,
        nick           = nickObj.nick,
        nameContainer  = $('div.channel[data-channel="' + channel + '"] div.names ul'),
        numContainer   = $('div.channel[data-channel="' + channel + '"] div.names ul li.names-count .num'),
        namesCount     = parseInt(numContainer.text(), 10),
        newCount       = --namesCount,
        exists;

    exists = nameContainer.find('.nick[data-nick="'+ nick +'"]');

    if (exists.length) {
      exists.remove();

      // Update counts.
      numContainer.text(newCount);
    }

  }

  function nameComplete(word, channel) {
    // Complete based on the names we have in this channel.

    var namesEls = $('#channel-containers div.channel[data-channel="' + channel + '"] div.names ul li.nick'),
        names    = {};

    word = word[0].toLowerCase();

    if (namesEls.length) {
      namesEls.each(function(i, el) {
        var name     = $(el).attr('data-nick');
        var lowered  = name.toLowerCase();

        names[lowered] = name;
      });
    }

    for (var n in names) {
      // Check if the word matches the  beginning of the nick, as soon
      // as a match is found return it.
      if (n.startsWith(word)) {
        return names[n];
      }
    }

    return false;
  }

  function processMsg(msg) {
    // Further processing on msg.

    // Linkify URLS.
    var urlRegex = new RegExp(/(https?[^ ]+)/),
        split = msg.split(urlRegex),
        newMsg = '';

    if (split.length) {

      newMsg = split[0];

      // Combine the link and msg parts. Links will be odd.
      for (var i = 1; i < split.length; i += 2) {
        newMsg += '<a href="'+ split[i] +'" target="_blank">'+ split[i] +'</a>' + split[i+1];
      }
    }

    return newMsg || msg;
  }

  function updateNotifications(channel, action) {
    console.log('channel', channel, action);
    var focusedChannel = history.state.channel || 'main',
        channelListEl  = $('#channel-list li[data-channel="' + channel + '"]'),
        messageCounter = channelListEl.find('.msg-counter');

    switch (action) {
      case 'read':
        messageCounter.fadeOut(function() {
          messageCounter.remove();
        });

        break;

      case 'add':

        // If we're focused on this channel do nothing, otherwise update the counters.
        if (channel === focusedChannel) {
          return;
        }

        if (!messageCounter.length) {
          channelListEl.append('<span class="msg-counter">1</span>');
        } else {

          var count    = parseInt(messageCounter.text(), 10),
              newCount = ++count;

           messageCounter.text(newCount);
        }

        break;

      default:

        break;

    }
  }

  function postToChannel(msgObj) {

    console.log('post to channel', msgObj);

    var channel    = msgObj.channel,
        nick       = msgObj.nick,
        msg        = msgObj.msg.split('\n'),
        type       = msgObj.type,
        when       = (msgObj.when ? moment(msgObj.when).format('YYYY-MM-DD h:mm:ss') : undefined),
        safe       = msgObj.safe,
        ours       = nick === socketNick,
        color      = 'none',
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

      // Keep a copy of all messages as well as our messages.
      chanMsgs = channels[channel].messages;
      if (chanMsgs) {
         channels[channel].messages.push(msgObj);
         if (ours) {
            channels[channel].ourMessages.push(msgObj);
         }
      } else {
         channels[channel].messages = [msgObj];
         if (ours) {
            channels[channel].ourMessages = [msgObj];
         } else {
            channels[channel].ourMessages = [];
         }
      }
      // Reset msgIdx.
      channels[channel].msgIdx = null;

      containers = $('#channel-containers div[data-channel="' + channel + '"] div.messages ul');

      updateNotifications(channel, 'add');

    } else { // If no channel is provided send to all channels.
      containers = $('#channel-containers div.messages ul');
    }

    switch (type) {
      case 'system':

        msg.forEach(function(m) {
            m = safe ? m : escapeHTML(m);
            html += '<li class="message system_msg"><span class="timestamp">' + when + '</span><span class="text">' + m + '</span></li>';
        });

        appendHTML(containers, html);

        break;

      case 'user':

        msg.forEach(function(m) {
          m       = processMsg( safe ? m : escapeHTML(m) );
          hilited = (m.indexOf(socketNick) !== -1 && nick !== socketNick) ? 'hilited' : '';
          if (m) {
            html += '<li class="message '+ type + ' '+ hilited + '" data-to="' + channel +  '">' +
                    '<span class="timestamp">' + when + '</span>' +
                    '<span class="nick color_'+ color + '">' + nick + '</span>: <span class="text">' + m + '</span></li>';
          }
        });

        appendHTML(containers, html);

        break;

      case 'action':

        m    = processMsg( safe ? msg : escapeHTML(msg) );
        html = '<li class="message '+ type + ' '+ hilited + '" data-to="' + channel +  '">' +
               '<span class="timestamp">' + when + '</span>' +
               '<span class="action color_' + color + '"> * ' + nick + ' ' + m + '</span></li>';

        appendHTML(containers, html);

        break;

      case 'error':

          m    = safe ? msg : escapeHTML(msg);
          html = '<li class="message error"><span class="timestamp">' + when + '</span><span class="text">' + m + '</span></li>';

          appendHTML(containers, html);

          break;

      default:
        // Do nothing.
        break;
    }

    if (channel) {
      scrollToBottom(channel);
    }
  }

  function scrollToBottom(channel) {
    // Keep scroll at bottom of channel window.

    if (!channels[channel].scrolling) {
      var scrollArea = $('div.channel[data-channel="' + channel + '"] .messages');

      if (scrollArea.length > 0) {
        scrollArea.animate({'scrollTop': scrollArea[0].scrollHeight }, 'slow');
      }
    }

  }

  function connectToIRC(opts) {
    socket.emit('connectToIRC', opts);
    closeAlert('disconnected');
    createAlert({ msg: 'Connecting to '+ opts.server + ' ...', level: 'warning', label: 'connecting'});
  }

  function joinChannel(channel) {
    var channelList      = $('#channel-list'),
        isPm             = channel.startsWith('@'),
        root             = channel === 'main',
        linkHTML         = '<li data-channel="'+ channel +'" class="channel">' +
                           '<a href="' + channel  +'" class="channelLink button tiny radius">' + channel + '</a>' +  (root ? '' : '<span class="part">&times;</span>') +
                           '</li>',
        channelCont      = $('#channel-containers'),
        channelHTML      = '<div class="channel hidden row" data-channel="' + channel + '">' +
                           (root || isPm  ? '' : '<div class="topic">Topic: <span></span></div>') +
                           (root || isPm  ? '<div class="columns messages">' : '<div class="small-9 columns messages">') +
                           '<ul class="no-bullet"></ul>' +
                           '</div>' +
                           (root || isPm ? '' : '<div class="small-3 columns names"><ul class="no-bullet"></ul></div>') +
                           '</div>';


      // Store channel.
      var exists = channel in channels;

      if (!exists) {
        channels[channel] = {};
      }

      // Check for existing loaded UI, and continue from there.
      var existingChannelLink = channelList.find('li[data-channel="' + channel + '"]');
      if (!existingChannelLink.length) {
        channelList.append(linkHTML);

        // Add click behaviour for parting.
        $('#channel-list li[data-channel="'+channel+'"] .part').on('click', function() {
          socket.emit('webCommand', {
            target: channel.startsWith('@') ? channel.slice(1) : channel,
            command: '/part',
          });
        });

        // Add click behaviour for channel list.
        $('#channel-list li[data-channel="'+channel+'"] a').on('click', function(e) {
          var channel = $(this).attr('href');

          if (root) {
            history.pushState({ root: true, }, '', '/');
          } else {
            history.pushState({ channel: channel }, '', '/channel/' + channel + '/');
          }

          $(window).trigger('pathchange');

          return false;
        });

      }

      var existingChannel = channelCont.find('div[data-channel="' + channel + '"]').length;
      if (!existingChannel) {
        channelCont.append(channelHTML);
        setContainerHeight({ channel: channel});
      }

      // Switch to channel.
      if (history.state && history.state.channel === channel) {
        existingChannelLink.removeClass('selected').addClass('selected');
      } else {
        if (root) {
          history.pushState({ root: true }, '', '/');
        } else {
          history.pushState({ channel: channel }, '', '/channel/' + channel + '/');
        }
        $(window).trigger('pathchange');
      }

      // Hook scrolling.
      var messagesEl = $('div[data-channel="' + channel +  '"] .messages');

      messagesEl.on('scroll', function() {
          // Check scroll bar position.
          var messagesTop    = messagesEl.scrollTop(),
              messagesHeight = messagesEl.innerHeight(),
              scrollHeight   = messagesEl[0].scrollHeight,
              position       = scrollHeight - messagesHeight; // Scroll bar is at the end this will match scrollTop

          if (position === messagesTop || scrollHeight === messagesHeight) {
            channels[channel].scrolling = false;
          } else {
            channels[channel].scrolling = true;
          }
      });


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

  // Changing nick through form.
  $('form.changenick').on('valid.fndtn.abide', function() {
      var newNick = $('input[name="newNick"]').val();

      $('a.close-reveal-modal').click();

      socket.emit('webCommand', {
        command: '/nick ' + newNick,
      });

      return false;

  });

  // Sending message from web.
  $('form.send').submit(function(e) {

    if (e) { e.preventDefault(); }

    var el  = $('input[name=message]'),
        val = el.val();

    // Get the channel from the URL
    var channel   = history.state.channel || 'main',
        pm        = channel.indexOf('@') === 0,
        msg       = val,
        isCommand = msg.indexOf('/') === 0;

    var msgObj = {
      nick    : socketNick,
      when    : moment(),
      channel : channel,
    };

    if (isCommand) {
      console.log('sending command ...', msg, channel);
      socket.emit('webCommand', {
        target: (pm ? channel.slice(1) : channel),
        command: msg,
      });

      // Post user commands to the main window.
      msgObj.type    = 'system';
      msgObj.msg     = msg;
      msgObj.channel = 'main';

      postToChannel(msgObj);

    } else if (msg) {
      console.log('sending message ...', msg);
      socket.emit('webMessage', {
        target  : (pm ? channel.slice(1) : channel), // Either channel or nick
        msg     : msg,
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
        color: 'none',
      };
    }

    return false;
  });

  // Hijack tab behaviour.
  $('form.send').on('keydown', function(e) {
    var keyCode = e.keyCode || e.which,
        inputEl,
        val,
        channel,
        messages,
        msgIdx,
        msgObj,
        last;


    var codes = {
      9 : function() {
        if (e) {
          e.preventDefault();
        }

        // A value exists and the last character is not a space, try to autocomplete.
        if (val && val[val.length-1] !== " ") {

          var words   = val.split(' '),
              last    = val.split(' ').slice(-1), // We only want the last word to autocomplete.
              match   = nameComplete(last, channel),
              newVal;

          if (match) {
            // Plug in the value.
            if (words.length > 1) {
              newVal = words.slice(0, -1).join(' ') + ' ' + match + ' ';
            } else {
              newVal = match + ' ';
            }
            inputEl.val(newVal);
          }
        }

      },
      38 : function()  {
        var timeout;
        // Up key - walk up message history.

        msgIdx   = channels[channel].msgIdx;
        messages = channels[channel].ourMessages;

        if (msgIdx === null) {
          msgIdx = messages.length;
        }

        if (msgIdx > 0) {
          msgIdx -= 1;
        }

        // Set new msg index.
        channels[channel].msgIdx = msgIdx;

        msgObj = messages[msgIdx];

        if (timeout) {
          clearTimeout(timeout);
        }

        timeout = setTimeout(function() {
          inputEl.val(msgObj.msg + ' ');
          inputEl.focus();
        }, 100);

      },

      40 : function() {

        // Down key - walk down message history
        msgIdx   = channels[channel].msgIdx;
        messages = channels[channel].ourMessages;

        if (msgIdx < messages.length-1) {
          msgIdx += 1;
        }

        // Set new msg index.
        channels[channel].msgIdx = msgIdx;

        msgObj = messages[msgIdx];

        inputEl.val('');
        inputEl.val(msgObj.msg + ' ').focus();
      },

    };

    if (keyCode in codes) {

      channel = history.state ? history.state.channel : false;

      // Make sure we have a channel.
      if (!channel || !(channel in channels)) {
        return;
      }

      inputEl = $('form.send input[name=message]');
      val     = inputEl.val();

      codes[keyCode]();
    }

  });

  socket.on('ircConnected', function(data) {
    console.log('*** ircConnected', data);

    connected  = true;
    socketNick = data.nick;

    var when         = data.when,
        server       = data.server,
        serverMsg    = data.serverMsg,
        clientsCount = data.clientsCount,
        gotChannels  = data.channels.length;

    var msgObj = {
      channel : 'main',
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
                   '<li><a id="change-nick">Change Nick</a></li>' +
                   '<li><a id="disconnect">Disconnect</a></li>' +
                   '</ul>';
    $('.top-bar-section li.has-dropdown').append(menuHTML);

    $('#disconnect').on('click', function() {
      socket.emit('webCommand', {
        command : '/quit',
      });
      return false;
    });

    $('#change-nick').on('click', function() {
      $('#changeNickModal').foundation('reveal', 'open');
      return false;
    });

    // Add the main channel.
    joinChannel('main');

    history.pushState({ root: true }, '', '/');
    $(window).trigger('pathchange');

    postToChannel(msgObj);

    // Show the post form.
    $('form.send').fadeIn('slow', function() {
      $(this).find('input[name=message]').focus();
    });

  });

  socket.on('ircMOTD', function(data) {
    console.log('*** ircMOTD', data);
    var motd = data.motd,
        when = data.when;

    var msgObj = {
      channel : 'main',
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
        when    = data.when,
        type    = data.type,
        safe    = data.safe,
        us      = data.us;

    console.log('*** ircMessage', data);

    if (us) {
      console.log('us', us);
      channel = channel.indexOf('#') === 0 ? channel : '@'+channel;
      joinChannel(channel);
    }

    var msgObj  = {
      msg       : msg,
      nick      : nick,
      when      : when,
      channel   : channel,
      type      : type || 'user',
    };

    var cached = nick in nickCache;
    if (!cached) {
      nickCache[nick] = {
        color: getColor(),
      };
    }

    postToChannel(msgObj);

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

    // Show name counts first.
    nameContainer.append('<li class="names-count"><span class="num">'+ (users.length || 1) +'</span> users</li>');

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
    console.log('*** ircNick', data);

    var oldNick  = data.oldNick,
        newNick  = data.newNick,
        channels = data.channels,
        us       = data.us,
        when     = data.when;

    changeName({channels: channels, us : us, oldNick : oldNick, newNick : newNick, when: when });

  });

  socket.on('ircTopic', function(data) {
    var channel        = data.channel,
        topic          = data.topic,
        nick           = data.nick,
        when           = data.when,
        rawMsg         = data.message,
        topicContainer = $('div.channel[data-channel="'+ channel +'"] div.topic span');

    console.log('*** ircTopic', data);
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
    console.log('*** ircJoin', data);

    closeAlert('connected');

    var channel   = data.channel,
        nick      = data.nick,
        msg       = nick  + ' has joined channel: ' + channel,
        when      = data.when,
        us        = data.us;

    if (us) {

      // If we're joining check/create UI.
      joinChannel(channel);

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
    console.log('*** ircPart', data);

    var channel = data.channel,
        when    = data.when,
        us      = data.us,
        nick    = data.nick,
        reason  = data.reason;

    if (us) {
      // Remove local copy.
      if (channel in channels) {
        delete channels[channel];
      }

      // Remove UI els.
      var channelListEl = $('#channel-list li[data-channel="' + channel + '"]');
      channelListEl.fadeOut(400, function() {

        channelListEl.remove();

        var channelContEl = $('#channel-containers div[data-channel="' + channel + '"]');

        channelContEl.fadeOut(400, function() {

          channelContEl.remove();

          // Unhide root window.
          $('#channel-containers div[data-channel="main"]').removeClass('hidden');

          // Move back to root channel.
          history.pushState({ root: true } , '', '/');
          $(window).trigger('pathchange');

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
    console.log('*** ircQuit', data);

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

      history.pushState(null, null, '/');

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
    console.log('*** ircDisconnected', data);
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
        label= data.label,
        when = data.when;

    console.log('*** sysMessage: ', data);

    closeAlert();
    createAlert({
      msg   : msg,
      level : type,
      label : label,
    });

  });

  socket.on('ircError', function(data) {
    var msg     = data.msg,
        channel = data.channel || 'main',
        nick    = data.nick,
        all     = data.all,
        when    = data.when;

    console.log('*** ircError : ', data);

    var msgObj = {
      channel : channel,
      msg     : msg,
      when    : when,
      type    : 'error',
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
