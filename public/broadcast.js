const peerConnections = {};
const config = {
  iceServers: [
    { 
      "urls": "stun:stun.l.google.com:19302",
    },
    // { 
    //   "urls": "turn:TURN_IP?transport=tcp",
    //   "username": "TURN_USERNAME",
    //   "credential": "TURN_CREDENTIALS"
    // }
  ]
};

const socket = io();

socket.on("answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
});

socket.on("watcher", id => {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;

  let stream = videoElement.srcObject;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };

  peerConnection
    .createOffer()
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("offer", id, peerConnection.localDescription);
    });
});

socket.on("candidate", (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", id => {
  peerConnections[id].close();
  delete peerConnections[id];
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

// Get camera and microphone
const videoElement = document.querySelector("video");

getStream()
  .then(getDevices);

function getDevices() {
  return navigator.mediaDevices.enumerateDevices();
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  return navigator.mediaDevices
    .getDisplayMedia({
      video: {
        frameRate: { ideal: 60, max: 60 },
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 }
      },
      audio: true,
      cursor: 'always',
    })
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream;
  videoElement.srcObject = stream;
  socket.emit("broadcaster");
}

function handleError(error) {
  console.error("Error: ", error);
}
