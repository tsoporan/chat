'use strict';

/* Controllers */

angular.module('chatApp.controllers', []).
  controller('AppCtrl', ["$scope", "socketService", function ($scope, socket) {
    $scope.name = "Testing";
  }]);
