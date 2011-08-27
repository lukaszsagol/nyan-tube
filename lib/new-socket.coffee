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
    user = if client.handshake.session.user then clien.handshake.session.user.name else client.handshake.session.uid || 'none'
		id = client.id
		master = true
	
	io.sockets.on 'error', () ->
		console.log 'ERROR ' + arguments
