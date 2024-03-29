nyan = null;

(function($) {

  nyan = {
    youtubeId:  null,
    roomId:     null,
    player:     null,
    master:     null,
    player_loading: null,
    maxDelta: 2,
    name: null,
    synchronize: true,

    prepareRoom: function(roomData, youtubeUrl) {
      var ytId = nyan.parseYoutubeId(youtubeUrl);

      if (ytId) {
        nyan.youtubeId = ytId;
        nyan.roomId = roomData.roomId;

        $('#home').hide();
        $('#room').show();
        $('#url').val('http://nyan.no.de/r/'+nyan.roomId);
        $('#synchronization').css('visibility', 'hidden');
        $('#sync_tooltip').css('visibility', 'hidden');

        nyan.connectToSocket();
      } else {
        alert('Provided URL is not correct.');
      }
    },

    joinRoom: function() {
      nyan.roomId = roomId;
      
      $('#room').show();
      $('#url').val('http://nyan.no.de/r/'+nyan.roomId);

      nyan.connectToSocket();
    },

    goToTime: function(time) {
      nyan.player.seekTo(time);
    },

    timestampToDisplay: function(secs) {
      var hours = Math.floor(secs / (60 * 60));
      var divisor_for_minutes = secs % (60 * 60);
      var minutes = Math.floor(divisor_for_minutes / 60);
      var divisor_for_seconds = divisor_for_minutes % 60;
      var seconds = Math.ceil(divisor_for_seconds);


      if (minutes.toString().length == 1) {
        minutes = '0'+minutes;
      }

      if (seconds.toString().length == 1) {
        seconds = '0'+seconds;
      }

      var result = '';
      if (hours > 0) {
        result += hours + ':';
      }
      result += minutes+':'+seconds;

      return result;
    },

    toggleSynchronization: function() {
      return (nyan.synchronize = !!!nyan.synchronize);
    },

    parseYoutubeId: function(url) {
      var re = /https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\S*[^\w\-\s])([\w\-]{11})(?=[^\w\-]|$)(?![?=&+%\w]*(?:[\'"][^<>]*>|<\/a>))[?=&+%\w]*/ig;
      var response = url.replace(re, '$1');
      if (response == url) {
        return false;
      } else {
        return response;
      }
    },

    connectToSocket: function() {
      var socket = io.connect(null, { port: '#socketIoPort#', rememberTransport: true, transports: ['websocket', 'flashsocket', 'xhr-multipart', 'xhr-polling'] });

      socket.on('connect', function() {
        var master = !!(nyan.roomId && nyan.youtubeId);
        socket.emit('room', { roomId: nyan.roomId, master: master });
      });

      socket.on('room', function(isMaster) {
        nyan.master = isMaster;

        if (nyan.youtubeId) {
          nyan.loadYoutubePlayer();
        }

        $('#chatbox').removeClass('full_loading');

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

        socket.on('newMaster', function() {
          nyan.master = true
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

          $('#synchronization').css('visibility','hidden');
          $('#sync_tooltip').css('visibility', 'hidden');
        });

        socket.on('chatName', function(correct, name) {
          if (correct) {
            nyan.name = name;
            $('#login_to_chat').remove();
            $('.chat_inputs').removeAttr('disabled');
          } else {
            $('#chat_login_loading').hide();
            $('#login_to_chat .error').text('Name already taken.');
            $('#chat_name_send').removeAttr('disabled');
          }
        });


        $('#synchronization').hover(function(e) {
          $('#sync_tooltip').show();
        }, function(e) {
          $('#sync_tooltip').hide();
        });

        $('#synchronization').click(function(e) {
          if (nyan.toggleSynchronization()) {
            $(this).removeClass('disabled');
          } else {
            $(this).addClass('disabled');
          }
        });

        $('#chat_name').keypress(function(e) {
          if (e.which && e.which == 13) {
            $('#chat_name_send').click();
          };
        });

        $('#chat_name_send').click(function() {
          var name = $('#chat_name').val();

          if (name != '') {
            $(this).attr('disabled', 'disabled');
            $('#chat_login_loading').show();
            socket.emit('chatName', name);
          }
        });
      });

      socket.on('videoState', function(syncData) {
        if (nyan.player) {
          if (!nyan.master && nyan.synchronize) {
            // update videoId if needed!
            if (nyan.player.getPlayerState() != syncData.playerState) {
              if (syncData.playerState == 1) {
                nyan.player.playVideo();
              } else {
                nyan.player.pauseVideo();
              }
            }
            if (Math.abs(syncData.currentTime - nyan.player.getCurrentTime()) > nyan.maxDelta) {
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

      socket.on('server', function(msg) {
        var html = '';
        html += '<dt class="server">Server</dt>'
        html += '<dd class="server">'+msg+'</dd>'
        $('#chat').append(html);
        $('#chat').scrollTop($('#chat')[0].scrollHeight);
      });

      socket.on('chat', function(user, timestamp, msg, master) {
        var html = '';
        var class = '';
        if (nyan.name == user) {
          class = 'own'
        }
        if (master) {
          class += ' master'
        }
        html += '<dt class="'+class+'"><span class="name">'+user+'</span>';
        var display_timestamp = nyan.timestampToDisplay(timestamp);
        html += '<span class="timestamp"><a href="#" onclick="nyan.goToTime(\''+timestamp+'\')">['+display_timestamp+']</a></span>';
        var datetime = new Date().getHours().toString() + ':' + new Date().getMinutes().toString();
        html += '<span class="datetime">'+datetime+'</span></dt>';
        html += '<dd class="'+class+'">'+msg+'</dd>';
        $('#chat').append(html);
        $('#chat').scrollTop($('#chat')[0].scrollHeight);
      });


      $('#chat_send').click(function() {
        var text = $('#chat_input').val();
        if (text != '') {
          var time = parseInt(nyan.player.getCurrentTime());
          socket.emit('chat', time, text);
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
      swfobject.embedSWF("http://www.youtube.com/e/"+nyan.youtubeId+"?version=3&enablejsapi=1", "player", "580", "480", "9", "/swf/expressInstall.swf", null, params, attrs);
    },

    playerLoaded: function() {
    },
  };


  $('#youtube_id').bind('keyup paste', function(e) {
    setTimeout(function() { loadYoutubePreview(); }, 10);
  });

  function loadYoutubePreview() {
    var ytPreview = $('#yt_preview');
    if (!ytPreview.hasClass('loading')) {
      ytPreview.addClass('loading');
      $.ajax({
        type: 'POST',
        url: '/oembed',
        data: $('#main_form').serialize(),
        success: function(ytData) {
          ytPreview.removeClass('loading');
          ytPreview.empty();
          if (ytData.status == 'OK') {
            ytPreview.append('<a class="image_link submit_form" href="#"><img src='+ytData.data.thumbnail_url+' /></a>');
            ytPreview.append('<h2><a class="submit_form" href="#">'+ytData.data.title+'</a></h2>');
            ytPreview.append('<a class="btn success large submit_form" id="join_room" href="#">I want to watch it!</a>');
          }
        }
      })
    }
  }

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

  $('.submit_form').live('click', function(event) {
    event.preventDefault();
    $('#main_form').submit();
  });

  if (window.roomId) {
    nyan.joinRoom();
  }

  setTimeout(function() { $('.alert-message').fadeOut(); }, 3000);
  $('.close').click(function() { $(this).parent().fadeOut(); });
})(jQuery);

function onYouTubePlayerReady(playerId) {
  nyan.player = document.getElementById('ytPlayer');
  nyan.playerLoaded();
};
