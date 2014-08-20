var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', { title: '#chat' });
});

module.exports = router;
