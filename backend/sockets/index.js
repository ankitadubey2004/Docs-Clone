const socketIO = require('socket.io');
const mergeDelta = require('../utils/mergeDelta'); // <-- import

module.exports = (server) => {
  const io = socketIO(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('join', ({ docId, userId }) => {
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
    });

    // 🔹 Delta with merge
    socket.on('delta', async ({ docId, delta }) => {
      try {
        const merged = await mergeDelta(docId, delta);
        
        // Broadcast merged content (instead of raw delta)
        socket.broadcast.to(docId).emit('delta', merged);
      } catch (err) {
        console.error('Delta merge failed:', err);
      }
    });

    socket.on('cursor', ({ docId, position }) => {
      socket.broadcast.to(docId).emit('cursor', { userId: socket.userId, position });
    });

    socket.on('chat', ({ docId, message }) => {
      io.to(docId).emit('chat', { userId: socket.userId, message });
    });

    socket.on('disconnect', () => {
      // TODO: Update presence on leave
    });
  });
};
