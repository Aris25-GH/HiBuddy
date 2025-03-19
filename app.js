// DOM Elements
const authDiv = document.getElementById('auth');
const chatDiv = document.getElementById('chat');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Firebase Authentication
loginButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authDiv.style.display = 'none';
        chatDiv.style.display = 'block';
        startVideoChat();
    } catch (error) {
        alert(error.message);
    }
});

signupButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        authDiv.style.display = 'none';
        chatDiv.style.display = 'block';
        startVideoChat();
    } catch (error) {
        alert(error.message);
    }
});

// Firebase Realtime Database for Messages
import { ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const messagesRef = ref(database, 'messages');

onChildAdded(messagesRef, (snapshot) => {
    const message = snapshot.val();
    const messageElement = document.createElement('div');
    messageElement.textContent = `${message.sender}: ${message.text}`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message) {
        push(messagesRef, {
            sender: auth.currentUser.email,
            text: message,
        });
        messageInput.value = '';
    }
});

// WebRTC Functions
let localStream;
let remoteStream;
let peerConnection;
const servers = {
    iceServers: [
        { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
};

async function startVideoChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        createPeerConnection();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ candidate: event.candidate }));
        }
    };
}

// WebSocket for Signaling
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.offer) {
        handleOffer(data.offer);
    } else if (data.answer) {
        handleAnswer(data.answer);
    } else if (data.candidate) {
        handleCandidate(data.candidate);
    }
};

async function handleOffer(offer) {
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    ws.send(JSON.stringify({ answer }));
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
    await peerConnection.addIceCandidate(candidate);
}
