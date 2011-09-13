var settings = {
	'sessionSecret': 'sessionSecret'
	, 'port': 8080
	, 'uri': 'http://localhost:8080' // Without trailing /

	// You can add multiple recipiants for notifo notifications
	// , 'notifoAuth': [
	//   {
	//     'username': ''
	//     , 'secret': ''
	//   }
	// ]

	/*
	// Enter API keys to enable auth services, remove entire object if they aren't used.
	, 'external': {
		'facebook': {
			appId: '',
			appSecret: ''
		}
		, 'twitter': {
			consumerKey: '',
			consumerSecret: ''
		}
		, 'github': {
			appId: '',
			appSecret: ''
		}
	}
	*/
	, 'debug': (process.env.NODE_ENV !== 'production')
};

if (process.env.NODE_ENV == 'production') {
	settings.uri = 'http://nyan.no.de';
	settings.port = process.env.PORT || 80; // Joyent SmartMachine uses process.env.PORT

	settings.airbrakeApiKey = ''; // Error logging, Get free API key from https://airbrakeapp.com/account/new/Free
}
module.exports = settings;
