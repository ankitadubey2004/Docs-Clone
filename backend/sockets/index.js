const socketIO = require('socket.io');
const mergeDelta = require('../utils/mergeDelta'); // delta merge + version control
const Version = require('../models/Version');      // latest version load

module.exports = (server) => {
  const io = socketIO(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    // 🔹 Join Room
    socket.on('join', async ({ docId, userId }) => {
      socket.userId = userId;
      socket.join(docId);

      // Presence: Get all users in room
      const room = io.sockets.adapter.rooms.get(docId) || new Set();
      const users = [];
      for (let clientId of room) {
        const clientSocket = io.sockets.sockets.get(clientId);
        users.push({ id: clientSocket.userId, cursor: null });
      }
      io.to(docId).emit('presence', users);

      // 🔹 Send latest doc content (so new user gets up-to-date doc)
      try {
        const latest = await Version.findOne({ document: docId })
          .sort({ timestamp: -1 })
          .lean();

        if (latest) {
          socket.emit('load-document', latest.content);
        }
      } catch (err) {
        console.error('Error fetching latest version:', err);
      }
    });

    // 🔹 Handle incoming delta with merge + broadcast
    socket.on('delta', async ({ docId, delta }) => {
      try {
        const merged = await mergeDelta(docId, delta);
        // Broadcast merged content to other clients
        socket.broadcast.to(docId).emit('delta', merged);
      } catch (err) {
        console.error('Delta merge failed:', err);
      }
    });

    // 🔹 Cursor position updates
    socket.on('cursor', ({ docId, position }) => {
      socket.broadcast.to(docId).emit('cursor', { userId: socket.userId, position });
    });

    // 🔹 Real-time chat inside doc
    socket.on('chat', ({ docId, message }) => {
      io.to(docId).emit('chat', { userId: socket.userId, message });
    });

    // 🔹 Disconnect handling
    socket.on('disconnect', () => {
      // TODO: Remove from presence list
    });
  });
};
