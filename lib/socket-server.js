module.exports = function Server(express, sessions) {
  var parseCookie = require('connect').utils.parseCookie;
  var io          = require('socket.io').listen(express);

  io.configure(function() {
    io.set('log level', 3);
  });

  io.set('authorization', function(handshakeData, ack) {
    var cookie = parseCookie(handshakeData.headers.cookie);

    sessions.get(cookie['connect.sid'], function(err, sessionData) {
      handshakeData.session = sessionData || {};
      handshakeData.sid = cookie['connect.sid'] || null;
      ack(err, err ? false : true);
    });
  });

  var userList = {'nyan': []};
  var currentPlayerState = 'pause';

  io.sockets.on('connection', function(client) {
    var room = 'nyan';
		var user = client.handshake.session.user ? client.handshake.session.user.name : 'UID: '+(client.handshake.session.uid || 'has no UID');
    var users = userList[room];

    client.join(room);

    users[user] = 1;
    io.sockets.in(room).emit('server', user, 'connected...');
    io.sockets.in(room).emit('usersList', users);
    client.emit('videoControl', currentPlayerState);

    client.on('chat', function(msg) {
      io.sockets.in(room).emit('chat', user, msg);
    });

    client.on('videoControl', function(action) {
      io.sockets.in(room).emit('videoControl', action);
      currentPlayerState = action;
    });

    client.on('disconnect', function() {
      delete users[user];
      io.sockets.in(room).emit('usersList', users);
      io.sockets.in(room).emit('server', user, 'disconnected...');
    });
  });

  io.sockets.on('error', function(){ console.log("ERROR "+arguments); });

  return io;
};
