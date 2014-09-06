var express = require('express');
var router = express.Router();
var fs = require('fs');

router.get('/', function(req, res) {

  var manifest  = JSON.parse(fs.readFileSync('public/build/rev-manifest.json')),
      assetPath = '/build/';

  res.render('index', {
    title          : '#chat',
    stylesheetPath : assetPath + manifest['build.min.css'],
    javascriptPath : assetPath + manifest['build.min.js'],
  });
});

module.exports = router;
