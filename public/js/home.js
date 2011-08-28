nyan = null;

(function($) {

  nyan = {
    youtubeId:  null,
    roomId:     null,
    player:     null,
    master:     null,
    player_loading: null,

    prepareRoom: function(roomData, youtubeUrl) {
      console.log('prepareRoom');
      var ytId = nyan.parseYoutubeId(youtubeUrl);

      if (ytId) {
        nyan.youtubeId = ytId;
        nyan.roomId = roomData.roomId;

        $('#home').hide();
        $('#room').show();

        nyan.connectToSocket();
      } else {
        alert('bledny URL!');
      }
    },

    joinRoom: function() {
      nyan.roomId = roomId;
      
      $('#room').show();

      nyan.connectToSocket();
    },

    parseYoutubeId: function(url) {
      console.log('parseYoutubeId');
      var re = /https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\S*[^\w\-\s])([\w\-]{11})(?=[^\w\-]|$)(?![?=&+%\w]*(?:[\'"][^<>]*>|<\/a>))[?=&+%\w]*/ig;
      var response = url.replace(re, '$1');
      if (response == url) {
        return false;
      } else {
        return response;
      }
    },

    connectToSocket: function() {
      console.log('connectToSocket');
      var socket = io.connect(null, { port: '#socketIoPort#', rememberTransport: true, transports: ['websocket', 'flashsocket', 'xhr-multipart', 'xhr-polling'] });

      socket.on('connect', function() {
        var master = !!(nyan.roomId && nyan.youtubeId);
        socket.emit('room', { roomId: nyan.roomId, master: master });
        console.log('Connected');
      });

      socket.on('room', function(isMaster) {
        console.log('Room: ' + isMaster);
        nyan.master = isMaster;


        if (nyan.youtubeId) {
          nyan.loadYoutubePlayer();
        }

        $('.chat_inputs').removeAttr('disabled');

        videoStateSender = setInterval(function() { 
          if (nyan.player) {
            var videoState = {
              youtubeId: nyan.youtubeId,
              playerState: nyan.player.getPlayerState(),
              currentTime: nyan.player.getCurrentTime()
            };

            socket.emit('videoState', videoState);
          }
        }, 500);

        if (!nyan.master) {
          clearInterval(videoStateSender);
        }
      });

      socket.on('videoState', function(syncData) {
        if (nyan.player) {
          if (!nyan.master) {
            // update videoId if needed!
            if (nyan.player.getPlayerState() != syncData.playerState) {
              if (syncData.playerState == 1) {
                nyan.player.playVideo();
              } else {
                nyan.player.pauseVideo();
              }
            }
            if (Math.abs(syncData.currentTime - nyan.player.getCurrentTime()) > 2) {
              nyan.player.seekTo(syncData.currentTime);
            }
          }
        } else {
          if (!nyan.playerLoading) {
            nyan.youtubeId = syncData.youtubeId;
            nyan.loadYoutubePlayer();
          }
        }
      });


      socket.on('chat', function(user, msg) {
        console.log(user+': '+msg);
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

    },

    loadYoutubePlayer: function() {
      nyan.playerLoading = true;
      var params = { allowScriptAccess: "always" };
      var attrs = { id: "ytPlayer" };
      //swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "player", "560", "480", "9", "/swf/expressInstall.swf", null, params, attrs);
      swfobject.embedSWF("http://www.youtube.com/e/"+nyan.youtubeId+"?version=3&enablejsapi=1", "player", "560", "480", "9", "/swf/expressInstall.swf", null, params, attrs);
    },

    playerLoaded: function() {
    },
  };

  $('#main_form').submit(function(event) {
    event.preventDefault();

    var form = $(this);
    var youtubeUrl = $('#youtube_id', form).val();
    $.ajax({
      type: form.attr('method'),
      url: form.attr('action'),
      data: form.serialize(),
      success: function(roomData) {
        nyan.prepareRoom(roomData, youtubeUrl);
      }
    });
  });

  if (roomId) {
    nyan.joinRoom();
  }
})(jQuery);

function onYouTubePlayerReady(playerId) {
  nyan.player = document.getElementById('ytPlayer');
  nyan.playerLoaded();
};
