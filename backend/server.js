// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const userRoutes = require('./routes/users');
require('dotenv').config();

const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Document = require('./models/Document');
const { QuillDeltaToHtmlConverter } = require('quill-delta-to-html');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    // origin: process.env.FRONTEND_URL || "http://localhost:5173",

    origin: process.env.FRONTEND_URL || "https://docs-clone-iltr.vercel.app",
    methods: ["GET", "POST"],
      credentials: true  
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collab-tool', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// In-memory maps for quick collaboration state
const activeDocuments = new Map();   // documentId -> Map(socketId -> { userId, username })
const documentStates = new Map();    // documentId -> { delta, version, lastSaved }

// JWT auth for socket.io (handshake)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    const raw = token.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(raw, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('Authentication error'));

    socket.user = { id: user._id.toString(), username: user.username };
    return next();
  } catch (err) {
    console.error('Socket auth error', err);
    return next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id, 'user', socket.user?.username);

  socket.on('join-doc', async ({ documentId }) => {
    try {
      const userId = socket.user.id;
      const username = socket.user.username;
      socket.join(documentId);

      if (!activeDocuments.has(documentId)) activeDocuments.set(documentId, new Map());
      activeDocuments.get(documentId).set(socket.id, { userId, username });

      // Load document state into memory if not present
      if (!documentStates.has(documentId)) {
        const doc = await Document.findById(documentId);
        if (doc) {
          documentStates.set(documentId, {
            delta: doc.contentDelta || { ops: [] },
            version: 0,
            lastSaved: Date.now()
          });
        } else {
          documentStates.set(documentId, {
            delta: { ops: [] },
            version: 0,
            lastSaved: Date.now()
          });
        }
      }

      // Send full doc state to joining client
      const state = documentStates.get(documentId);
      socket.emit('document-state', {
        contentDelta: state.delta,
        version: state.version
      });

      // Notify other clients of presence
      io.to(documentId).emit('users-update', Array.from(activeDocuments.get(documentId).values()));
      socket.to(documentId).emit('user-joined', { userId, username, socketId: socket.id });

      // Update DB's collaborator lastSeen (non-blocking)
      Document.findByIdAndUpdate(documentId, {
        $addToSet: { 'collaborators.user': userId },
        $set: { 'collaborators.$[elem].lastSeen': new Date() }
      }, {
        arrayFilters: [{ 'elem.user': userId }],
        new: true
      }).catch(() => {});
    } catch (err) {
      console.error('join-doc error', err);
    }
  });

  // Incoming deltas from clients
  socket.on('doc-delta', ({ documentId, delta }) => {
    try {
      // Apply delta to in-memory state
      const state = documentStates.get(documentId) || { delta: { ops: [] }, version: 0 };
      // A simple merge: use quill's Delta (we can use delta as-is; for safety we'll apply)
      // We'll rely on clients to operate on same base, quill will handle transforms client-side.
      // Increase version
      state.version = (state.version || 0) + 1;

      // Merge the incoming ops into state.delta by using simple concatenation via Quill Delta if available.
      // To avoid adding an extra dependency, assume delta is valid and update state.delta.ops via push.
      // For robust OT/CRDT, use sharedb/ot or yjs in production.
      state.delta = {
        ops: (state.delta.ops || []).concat(delta.ops || [])
      };
      state.lastSaved = Date.now();
      documentStates.set(documentId, state);

      // Broadcast to others
      socket.to(documentId).emit('doc-delta', { delta, userId: socket.user.id, version: state.version });
    } catch (err) {
      console.error('doc-delta error', err);
    }
  });

  // Cursor updates
  socket.on('cursor-update', ({ documentId, range }) => {
    try {
      socket.to(documentId).emit('cursor-update', { userId: socket.user.id, range });
    } catch (err) {
      console.error('cursor-update error', err);
    }
  });

  // Periodic or debounced client-initiated save
  socket.on('save-doc', async ({ documentId, contentDelta }) => {
    try {
      const state = documentStates.get(documentId);
      if (state) {
        // Merge or replace in-memory state with client's contentDelta (safer to replace)
        state.delta = contentDelta;
        state.lastSaved = Date.now();
        documentStates.set(documentId, state);
      } else {
        documentStates.set(documentId, { delta: contentDelta, version: 0, lastSaved: Date.now() });
      }

      // Persist to DB: save contentDelta and convert to HTML for legacy content
      const converter = new QuillDeltaToHtmlConverter(contentDelta.ops || [], {});
      const html = converter.convert();

      await Document.findByIdAndUpdate(documentId, {
        contentDelta,
        content: html,
        $push: {
          versions: {
            delta: contentDelta,
            html,
            editedBy: socket.user.id,
            timestamp: new Date()
          }
        }
      }, { new: true });
    } catch (err) {
      console.error('save-doc error', err);
    }
  });

  // Chat / presence events (you already have similar handlers)
  socket.on('chat-message', (data) => {
    io.to(data.documentId).emit('chat-message', {
      ...data,
      userId: socket.user.id,
      username: socket.user.username
    });
  });

  socket.on('disconnect', async () => {
    try {
      // Remove user from activeDocuments
      for (const [documentId, usersMap] of activeDocuments.entries()) {
        if (usersMap.has(socket.id)) {
          const userData = usersMap.get(socket.id);
          usersMap.delete(socket.id);

          io.to(documentId).emit('user-left', userData);
          io.to(documentId).emit('users-update', Array.from(usersMap.values()));

          if (usersMap.size === 0) {
            activeDocuments.delete(documentId);

            // Persist final state for that document if available
            const docState = documentStates.get(documentId);
            if (docState) {
              try {
                const converter = new QuillDeltaToHtmlConverter(docState.delta.ops || [], {});
                const html = converter.convert();
                await Document.findByIdAndUpdate(documentId, {
                  contentDelta: docState.delta,
                  content: html,
                  $push: {
                    versions: {
                      delta: docState.delta,
                      html,
                      editedBy: userData.userId,
                      timestamp: new Date()
                    }
                  }
                });
              } catch (err) {
                console.error('Error saving document on disconnect:', err);
              }
              documentStates.delete(documentId);
            }
          }
          break;
        }
      }
    } catch (err) {
      console.error('disconnect handler error', err);
    }

    console.log('Socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
