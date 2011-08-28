module.exports = (express, sessions) ->
  parseCookie = require('connect').utils.parseCookie
  io = require('socket.io').listen express
  redisClient = require('redis').createClient()
  sanitizer = require('sanitizer')

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
    id = client.id
    room = null

    client.on 'room', (roomData) ->
      room = roomData.roomId
      client.join room
      clientsCount = io.sockets.clients(room).length
      
      if clientsCount == 1
        client.master = roomData.master
      else
        client.master = false
    
      client.emit 'room', client.master

    client.on 'chatName', (newName) ->
      tempName = sanitizer.escape(newName)
      redisClient.sismember room+'_names', tempName, (err, val) ->
        if (val == 1)
          client.emit 'chatName', false, tempName
        else
          client.name = tempName
          redisClient.sadd room+'_names', tempName
          client.emit 'chatName', true, tempName

          clientList = []
          clientList += (if io.sockets.clients(room)[i].name then io.sockets.clients(room)[i].name + ', ' else '') for i in [0...io.sockets.clients(room).length]
          clientList = clientList.toString()
          msg = 'People in room: ' + clientList

          client.emit('server', msg)
          io.sockets.in(room).emit('server', tempName + ' joined the room.')


    client.on 'chat', (timestamp, msg) ->
      io.sockets.in(room).emit('chat', client.name, timestamp, sanitizer.escape(msg), client.master) if client.name != ''

    client.on 'videoState', (videoState) ->
      if client.master
        io.sockets.in(room).volatile.emit('videoState', videoState)
        client.youtubeId = videoState.youtubeId unless client.youtubeId

    client.on 'disconnect', () ->
      clientsCount = io.sockets.clients(room).length
      if clientsCount == 1
        redisClient.srem 'room_ids', room
        redisClient.del room+'_names'
      else
        console.log 'DISCONNECTED '+client.id
        if client.master
          i = 0
          nextMaster = io.sockets.clients(room)[i]
          while (nextMaster.id == client.id)
            console.log(nextMaster.id + ' cant be master')
            i++
            nextMaster = io.sockets.clients(room)[i]

          nextMaster.master = true
          nextMaster.emit('newMaster')
          io.sockets.in(room).emit('server', nextMaster.name + ' is the new master.')

      if client.name
        io.sockets.in(room).emit('server', client.name + ' left the room.')

  io.sockets.on 'error', () ->
    console.log 'ERROR ' + arguments
