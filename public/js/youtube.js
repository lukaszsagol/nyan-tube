function loadPlayer() {
  var params = { allowScriptAccess: "always" };
  var attrs = { id: "ytPlayer" };
  swfobject.embedSWF("http://www.youtube.com/apiplayer?version=3&enablejsapi=1&playerapiid=player1", "player", "640", "480", "9", null, null, params, attrs);
};

function onYouTubePlayerReady(playerId) {
  player = document.getElementById("ytPlayer");
  player.cueVideoById("QH2-TGUlwu4");
  player.playVideo();
};

google.setOnLoadCallback(loadPlayer);
