module.exports = (express, sessions) ->
  parseCookie = require('connect').utils.parseCookie
  io = require('socket.io').listen express
  redisClient = require('redis').createClient

  io.configure ->
    io.set 'log level', 3

  io.set 'authorization', (handshakeData, ack) ->
    cookie = parseCookie handshakeData.headers.cookie

    sessions.get cookie['connect.sid'], (err, sessionData) ->
      handshakeData.session = sessionData || {}
      handshakeData.sid = cookie['connect.sid'] || null

      ack(err, err ? false : true)
  io.sockets.on 'connection', (client) ->
    console.log 'New connection...'
    user = if client.handshake.session.user then clien.handshake.session.user.name else (client.handshake.session.uid or 'none')
    master = true
    id = client.id
    room = null

    client.on 'room', (roomData) ->
      console.log 'Room recieved'
      room = roomData.roomId
      client.join room
      master = roomData.master

      client.emit 'room', master

    client.on 'chat', (msg) ->
      console.log 'Chat recieved'
      io.sockets.in(room).emit('chat', user, msg)

    client.on 'videoState', (videoState) ->
      io.sockets.in(room).emit('videoState', videoState) if master

  io.sockets.on 'error', () ->
    console.log 'ERROR ' + arguments
