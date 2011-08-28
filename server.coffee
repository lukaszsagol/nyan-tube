siteConf      = require('./lib/getConfig')
process.title = siteConf.uri.replace(/http:\/\/(www)?/, '')

airbrake = null
if (siteConf.airbrakeApiKey)
	airbrake = require('airbrake').createClient(siteConf.airbrakeApiKey)

process.addListener 'uncaughtException', (err, stack) ->
	console.log 'Caught exception: '+err+'\n'+err.stack
	console.log '\u0007' # Terminal bell
	airbrake.notify(err) if airbrake

http         = require('http')
nko          = require('nko')('pQf4QyGm9TZP5LGu')
connect      = require('connect')
express      = require('express')
assetManager = require('connect-assetmanager')
assetHandler = require('connect-assetmanager-handlers')
csrf				 = require('express-csrf')

RedisStore   = require('connect-redis')(express)
sessionStore = new RedisStore()
redisClient  = require('redis').createClient()

app = module.exports = express.createServer()
app.listen(siteConf.port, null)

socketIo = new require('./lib/new-socket.coffee')(app, sessionStore)
authentication = new require('./lib/authentication.js')(app, siteConf)

assetsSettings =
	'js':
		'route'          : /\/static\/js\/[a-z0-9]+\/.*\.js/
		'path'           : './public/js/'
		'dataType'       : 'javascript'
		'files'          : [ 'jquery-latest.js', siteConf.uri + '/socket.io/socket.io.js', 'utils.js', 'home.js' ] # 'youtube.js' ]
		'debug'          : true
		'postManipulate' :
			'^': [ assetHandler.uglifyJsOptimize, (file, path, index, isLast, callback) ->
				callback(file.replace(/.#socketIoPort#./, siteConf.port))
			]
	'css':
		'route': /\/static\/css\/[a-z0-9]+\/.*\.css/
		'path' : './public/css/'
		'dataType': 'css'
		'files': ['bootstrap-1.1.1.min.css', 'client.css']
		'debug': true
		'postManipulate':
			'^': [ assetHandler.fixVendorPrefixes, assetHandler.fixGradients, assetHandler.replaceImageRefToBase64(__dirname+'/public'), assetHandler.yuiCssOptimize ]

assetsMiddleware = assetManager(assetsSettings)

app.configure () ->
	app.set 'view engine', 'jade'
	app.set 'views', __dirname+'/views'

app.configure () ->
	app.use express.bodyParser()
	app.use express.cookieParser()
	app.use assetsMiddleware
	app.use express.session({store: sessionStore, secret: siteConf.sessionSecret})
	app.use express.logger({'format': ':response-time ms - :date - :req[x-real-ip] - :method :url :user-agent / :referrer'})
	app.use authentication.middleware.auth()
	app.use authentication.middleware.normalizeUserData()
	app.use express['static'](__dirname+'/public', {'maxAge': 86400000})
	app.use csrf.check()

app.configure 'development', () ->
	app.use express.errorHandler({'dumpExceptions': true, 'showStack': true})
	app.all '/robots.txt', (req, res) ->
		res.send 'User-agent: *\nDisallow: /', {'Content-Type': 'text/plain'}

app.configure 'production', () ->
	app.use express.errorHandler()
	app.all '/robots.txt', (req, res) ->
		res.send 'User-agent: *', {'Content-Type': 'text/plain'}

app.dynamicHelpers({
  'csrf': csrf.token
	'assetsCacheHashes': (req, res) ->
		assetsMiddleware.cacheHashes
	'session': (req, res) ->
		req.session
	})

app.error (err, req, res, next) ->
	console.log err
	airbrake.notify(err) if airbrake
	
	if err instanceof NotFound
		res.render 'errors/404'
	else
		res.render 'errors/500'

NotFound = (msg) ->
	this.name = 'NotFound'
	Error.call this, msg
	Error.captureStackTrace this, arguments.callee


# helper
rooms = require('./lib/rooms.coffee')(redisClient)

# Real routing
app.get '/r/:rid', (req, res) ->
  roomId = req.params.rid
  redisClient.sismember 'room_ids', roomId, (err, val) ->
    if val == 1
      res.render 'room.jade', { roomId: roomId }
    else
      res.render 'home.jade', { flash: { error: '<b>Oh noes!</b> That room doesn\'t exist :(' }}

app.post '/oembed', (req, res) ->
  url = req.body.youtube_id
  opts =
    host: 'www.youtube.com'
    port: 80
    path: '/oembed?format=json&url='+encodeURIComponent(url)
    method: 'GET'
  
  proxy = http.request opts, (proxy_res) ->
    if proxy_res.statusCode == 200
      proxy_res.on 'data', (chunk) ->
        res.json { status: 'OK', data: JSON.parse(chunk) }
    else
      res.json { status: 'Wrong' }

  proxy.on 'error', (err) ->
    res.json { status: 'Error' }

  proxy.end()


app.post '/rooms/new', (req, res) ->
  rooms.generateRandomId (id) ->
    res.json { roomId: id }

app.get '/home', (req, res) ->
  res.render 'home.jade', { flash: null }

app.all '/', (req, res) ->
	res.render 'landing', { layout: 'plain' }

app.all '*', (req, res) ->
	throw new NotFound

console.log 'Running in '+(process.env.NODE_ENV || 'development')+' mode @ '+siteConf.uri

