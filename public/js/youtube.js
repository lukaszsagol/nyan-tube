function loadPlayer() {
  var params = { allowScriptAccess: "always" };
  var attrs = { id: "ytPlayer" };
  swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "player", "560", "480", "9", "/swf/expressInstall.swf", null, params, attrs);
};

function onYouTubePlayerReady(playerId) {
  player = document.getElementById("ytPlayer");
  player.loadVideoById("QH2-TGUlwu4");
  player.pauseVideo();

(function($) {
	socket = io.connect(null, {
		'port': '#socketIoPort#'
		, 'rememberTransport': true
		, 'transports': ['websocket', 'flashsocket', 'xhr-multipart', 'xhr-polling', 'htmlfile']
	});
	
	var chatroom = $('#chat');
	var userList = $('#users');

	socket.on('connect', function() {
		console.log('connected!');
		socket.emit('chat', 'Jestem!');
		$('.chat_inputs').removeAttr('disabled');
	});
	
	socket.on('server', function(user, msg) {
		chatroom.append('<li class="server">'+user+' '+msg+'</li>');
	});

	socket.on('chat', function(user,msg) {
		chatroom.append('<li class="chat">['+user+'] '+msg+'</li>');
	});

	socket.on('usersList', function(users) {
		console.log(users);
		userList.empty();
		for(var i in users) {
			userList.append('<li>'+i+'</li>');
		};
	});

	socket.on('videoControl', function(action) {
		var remote = {
			'play': function() { if (player) { player.playVideo(); }},
			'pause': function() { if (player) { player.pauseVideo(); }},
		}

		remote[action]();
	});

	socket.on('disconnect', function() {
		console.log('disconnected!');
		$('#chat_inputs').attr('disabled', 'disabled');
	});

	$('#chat_send').click(function() {
		var text = $('#chat_input').val();
		if (text != '') {
			socket.emit('chat', text);
			$('#chat_input').val('');
		}
	});

	$('#chat_input').keypress(function(e) {
		if (e.which && e.which == 13) {
			$('#chat_send').click();
		};
	});
})(jQuery);
};

function playVideo() {
  socket.emit('videoControl', 'play');
}

function pauseVideo() {
  socket.emit('videoControl', 'pause');
}

(function($) {
  loadPlayer();
})(jQuery);
