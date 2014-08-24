jQuery(document).ready(function($) {

  var socket = io();
  var connected = false;
  var nick;
  var channels = {};

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

  function postToChannel(msgObj) {

    console.log('post to channel', msgObj);

    var channel    = msgObj.channel,
        nick       = msgObj.nick,
        msg        = escapeHTML(msgObj.msg),
        type       = msgObj.type,
        when       = (msgObj.when ? moment(msgObj.when).format('YYYY-MM-DD h:mm:ss') : undefined),
        chanMsgs  = channels[channel].messages,
        containers,
        html;

    // Keep a copy of message.
    if (chanMsgs) {
      channels[channel].messages.push(msgObj);
    } else {
      channels[channel].messages = [msgObj];
    }
    console.log('chan msgs', chanMsgs);

    // If no channel is provided send to all channels.
    if (channel) {
      containers = $('#channel-containers div[data-channel="' + channel + '"] ul');
    } else {
      containers = $('#channel-containers div ul');
    }

    switch (type) {
      case 'system':
        html = '<li class="message system_msg"><span class="timestamp">' + when + '</span>' + msg + '</li>';
        appendHTML(containers, html);
        break;

      case 'user':
        html = '<li class="message '+ type +'" data-to="' + channel +  '">' +
               '<span class="timestamp">' + when + '</span>' +
               '<span class="nick">' + nick + '</span>: <span class="text">' + msg + '</span></li>';
        appendHTML(containers, html);
        break;

      default:
        break;
    }

    // Keep scroll at bottom of channel window.
    var scrollArea = $('div.channel[data-channel="' + channel + '"]');
    var scrollTop  = $('div.channel[data-channel="' + channel + '"]')[0].scrollHeight;
    scrollArea.animate({'scrollTop': scrollTop}, 'slow');

  }

  $('#disconnect').on('click', function(e) {
    console.log('disconnect clicked');
    socket.emit('disconnectIRC');
    return false;
  });

  // Connecting to IRC from web.
  $('form.connect').on('valid.fndtn.abide', function() {
    var server   = $('input[name=server]').val(),
        channels = $('input[name=channels]').val();

    nick = $('input[name=nickName]').val();

    socket.emit('connectToIRC', {
      server  : server,
      channels: channels,
      nick    : nick
    });

    $('a.close-reveal-modal').click();

    setTimeout(function() {
      $('.alert-box.connecting').show();
    }, 500);

    return false;
  });

  // Sending message from web.
  $('form.send').submit(function(e) {
    if (e) e.preventDefault();

    var el  = $('input[name=message]');
    var val = el.val();

    // Get the channel from the URL
    var channel = location.hash || '#root';
    var msg     = val;

    if (msg) {
      socket.emit('webMessage', {
        channel : channel,
        msg     : msg
      });
      el.val('');
    }

    var msgObj = {
      msg     : msg,
      nick    : nick,
      when    : moment(),
      channel : channel,
      type    : 'user',
    };

    postToChannel(msgObj);

    return false;
  });

  socket.on('ircConnected', function(data) {
    console.log('info received', data);

    connected = true;
    nick      = data.nick;

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

    // Hide alerts.
    $('.alert-box.connecting').hide();
    setTimeout(function() {
      $('.alert-box.connected').show();
    }, 500);

    // Hide the connect and show the user menu.
    $('#connect').addClass('hidden');

    var menuHTML = '<a>Hi, ' + nick + '</a>' +
                   '<ul class="dropdown">'+
                   '<li><a id="disconnect">Disconnect</a></li>' +
                   '</ul>';
    $('.top-bar-section li.has-dropdown').append(menuHTML);

    console.log('msgObj', msgObj);

    // Add the root channel.
    var channel     = '#root',
        channelHTML = '<div class="channel" data-channel="' + channel + '"><ul class="no-bullet"></ul></div>',
        channelList = $('#channel-list'),
        linkHTML    = '<li data-channel="'+ channel +'" class="channel">' +
                      '<a href="' + channel  +'" class="channelLink button tiny radius">' + channel + '</a>' +
                      '</li>';

    channelList.append(linkHTML);
    $('#channel-containers h2').remove();
    $('#channel-containers').append(channelHTML);
    channels['#root'] = {};

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

    postToChannel(msgObj);

    console.log('channel messages', channels[channel].messages);

  });

  socket.on('ircJoin', function(data) {
    console.log('ircJoin', data);

    var channel   = data.channel,
        msg       = data.nick  + ' has joined channel: ' + channel,
        when      = data.when;

    var msgObj = {
      channel : channel,
      nick    : nick,
      msg     : msg,
      type    : 'system',
      when    : when,
    };

    postToChannel(msgObj);

  });

  socket.on('createChannel', function(data) {
    var channel          = data.channel,
        channelList      = $('#channel-list'),
        linkHTML         = '<li data-channel="'+ channel +'" class="channel">' +
                           '<a href="' + channel  +'" class="channelLink button tiny radius">' + channel + '</a>' +
                           '</li>',
        channelContainer = $('#channel-containers'),
        channelHTML      = '<div class="channel hidden" data-channel="' + channel + '"><ul class="no-bullet"></ul></div>';

    channels[channel] = {};
    console.log('channels', channels);

    channelList.append(linkHTML);
    channelContainer.append(channelHTML);

  });

  socket.on('ircPart', function(data) {
    console.log('ircPart', data);

  });

  socket.on('ircDisconnected', function(data) {
    console.log('disconnect received');
    that.connected = false;
    var when = data.when;
    //$('#messages ul').append('<li class="message disconnected">You were disconnected.</li>');

    var msgObj = {
      msg  : 'You were disconnected!',
      type : 'system',
      when : when,
    };

    postToChannel(msgObj);

  });

  socket.on('error', function() {
    console.log('error', arguments);
  });

});
