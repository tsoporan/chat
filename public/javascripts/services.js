'use strict';

angular.module('chatApp.services', []).
  factory('socketService', ['$log', function($log) {
    var socket = io({ reconnectionAttempts: 5 });

    socket.on('connect', function() {
      $log.log('*** socket connected');
    });

    socket.on('disconnect', function() {
      $log.log('*** socket disconnected');
    });

    return socket;
  }]);
