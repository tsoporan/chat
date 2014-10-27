var express = require('express');
var router = express.Router();
var fs = require('fs');

router.get('/', function(req, res) {
  res.render('index', {
    title          : '#chat',
    debug          :  req.app.get('env') === 'development' ? true : false,
  });
});

module.exports = router;
