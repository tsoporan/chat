/*
 * Socket IO Express Server
 */

const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const compress = require('compression');
const helmet = require("helmet");

// Set up socket.io
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server)

const port = process.env.PORT || 3000;

// Middlewares
app.use(helmet());

app.use(morgan('dev'));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(compress());

app.use('/', (req, res) => {
  res.json({ msg: "OK "});
});

server.listen(port, function() {
  console.log(`>>> Starting Express server listening on port: ${port}`);
});

module.exports = io;
