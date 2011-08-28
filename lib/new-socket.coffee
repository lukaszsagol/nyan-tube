module.exports = (express, sessions) ->
  parseCookie = require('connect').utils.parseCookie
  io = require('socket.io').listen express
  redisClient = require('redis').createClient()

  io.configure ->
    io.set 'log level', 0

  io.set 'authorization', (handshakeData, ack) ->
    cookie = parseCookie handshakeData.headers.cookie

    sessions.get cookie['connect.sid'], (err, sessionData) ->
      handshakeData.session = sessionData || {}
      handshakeData.sid = cookie['connect.sid'] || null

      ack(err, err ? false : true)
  io.sockets.on 'connection', (client) ->
    user = if client.handshake.session.user then clien.handshake.session.user.name else (client.handshake.session.uid or 'none')
    master = true
    id = client.id
    room = null
    name = ''

    client.on 'room', (roomData) ->
      room = roomData.roomId
      client.join room
      clientsCount = io.sockets.clients(room).length
      
      if clientsCount == 1
        master = roomData.master
      else
        master = false
    
      client.emit 'room', master
    client.on 'chatName', (newName) ->
      name = newName
      # check if name is taken
      redisClient.sismember room+'_names', name, (err, val) ->
        if (val == 1)
          client.emit 'chatName', false, name
        else
          redisClient.sadd room+'_names', name
          client.emit 'chatName', true, name


    client.on 'chat', (timestamp, msg) ->
      io.sockets.in(room).emit('chat', name, timestamp, msg) if name != ''

    client.on 'videoState', (videoState) ->
      io.sockets.in(room).emit('videoState', videoState) if master

    client.on 'disconnect', () ->
      clientsCount = io.sockets.clients(room).length
      if clientsCount == 1
        redisClient.srem 'room_ids', room
        redisClient.del room+'_names'

  io.sockets.on 'error', () ->
    console.log 'ERROR ' + arguments
