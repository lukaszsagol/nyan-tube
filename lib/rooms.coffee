module.exports = (redisClient) ->
	res =
		generateId: () ->
			length = 8
			dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz'
			id = ''
			id += dict.charAt(Math.floor(Math.random() * dict.length)) for i in [0..length]
			id

		generateRandomId: (callback) ->
			id = res.generateId()
			redisClient.sismember 'room_ids', id, (err, val) ->
				if val == 1
					res.generateRandomId(callback) 
				else 
					console.log('redys')
					redisClient.sadd 'room_ids', id
					callback(id)
