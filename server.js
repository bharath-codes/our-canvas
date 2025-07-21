// server.js (New Version)

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity, can be locked down to your render URL
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

let users = {}; // Object to store user data { socket.id: { name: '...' } }

io.on('connection', (socket) => {
    console.log('A new user has connected:', socket.id);

    // 1. When a new user provides their name
    socket.on('userConnected', (name) => {
        users[socket.id] = { name: name || 'Anonymous' };
        // Tell EVERYONE (including the new user) the full list of users
        io.emit('updateUsers', users);
    });

    // 2. When a user moves their cursor
    socket.on('cursorMove', (data) => {
        // Broadcast to everyone ELSE
        socket.broadcast.emit('cursorMoved', { id: socket.id, x: data.x, y: data.y });
    });

    // 3. When a drawing event happens
    socket.on('drawing', (data) => {
        socket.broadcast.emit('drawing', data);
    });

    // 4. When a clear event happens
    socket.on('clear', () => {
        socket.broadcast.emit('clear');
    });

    // 5. When a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete users[socket.id];
        // Tell everyone that this user has left
        io.emit('userDisconnected', socket.id);
    });
});

server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));