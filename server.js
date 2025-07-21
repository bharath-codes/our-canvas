// server.js (Corrected Version)

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Using wildcard for simplicity. Can be your Render URL.
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

let users = {}; // Object to store user data { socket.id: { name: '...' } }

// This is the main connection block
io.on('connection', (socket) => {
    console.log('A new user has connected:', socket.id);

    // When a new user provides their name
    socket.on('userConnected', (name) => {
        users[socket.id] = { name: name || 'Anonymous' };
        io.emit('updateUsers', users);
    });

    // When a user moves their cursor
    socket.on('cursorMove', (data) => {
        socket.broadcast.emit('cursorMoved', { id: socket.id, x: data.x, y: data.y });
    });

    // When a drawing event happens
    socket.on('drawing', (data) => {
        socket.broadcast.emit('drawing', data);
    });

    // When a clear event happens
    socket.on('clear', () => {
        socket.broadcast.emit('clear');
    });

    // When a chat message event happens
    socket.on('chatMessage', (msg) => {
        const senderName = users[socket.id] ? users[socket.id].name : 'Anonymous';
        socket.broadcast.emit('chatMessage', { name: senderName, message: msg });
    });

    // When a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete users[socket.id];
        io.emit('userDisconnected', socket.id);
    });

}); // <-- THIS WAS LIKELY THE MISSING '}' BRACE

// This line starts the server
server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));