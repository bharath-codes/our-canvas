// server.js (Cleaned Version)

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

let users = {};

io.on('connection', (socket) => {
    console.log('A new user has connected:', socket.id);

    socket.on('userConnected', (name) => {
        users[socket.id] = { name: name || 'Anonymous' };
        io.emit('updateUsers', users);
    });

    socket.on('cursorMove', (data) => {
        socket.broadcast.emit('cursorMoved', { id: socket.id, x: data.x, y: data.y });
    });

    socket.on('drawing', (data) => {
        socket.broadcast.emit('drawing', data);
    });

       socket.on('clear', () => {
        socket.broadcast.emit('clear');
    });

    // NEW: When an undo event happens
    socket.on('undo', () => {
        socket.broadcast.emit('undo');
    });

    // NEW: When a redo event happens
    socket.on('redo', () => {
        socket.broadcast.emit('redo');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete users[socket.id];
        io.emit('userDisconnected', socket.id);
    });

});

server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));