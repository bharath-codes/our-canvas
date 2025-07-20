// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
// server.js

const io = socketIo(server, {
  cors: {
    origin: "https://our-canvas.onrender.com", // IMPORTANT: Use your actual Render URL here
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Tell Express to serve the 'public' folder
app.use(express.static('public'));

// This runs for every new user that connects
io.on('connection', (socket) => {
    console.log('A new user has connected:', socket.id);

    // When the server receives a 'drawing' event from a user...
    socket.on('drawing', (data) => {
        // ...it broadcasts the data to all OTHER users
        socket.broadcast.emit('drawing', data);
    });
    
    // When the server receives a 'clear' event from a user...
    socket.on('clear', () => {
        // ...it broadcasts the event to all OTHER users
        socket.broadcast.emit('clear');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));