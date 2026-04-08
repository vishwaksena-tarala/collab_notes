const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Map of noteId → Set of active user objects { userId, username }
 * Used to track who is currently editing which note.
 */
const activeUsers = new Map();

/**
 * Initialise all Socket.IO event handlers.
 * Called once from server.js after the IO instance is created.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance
 */
const socketHandler = (io) => {
  /**
   * Authentication middleware for Socket.IO.
   * Expects token in handshake.auth.token or handshake.query.token.
   */
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username email');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket for use in event handlers
      socket.user = { id: user._id.toString(), username: user.username, email: user.email };
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} | User: ${socket.user.username}`);

    // ─────────────────────────────────────────────
    // JOIN NOTE ROOM
    // Client emits this when opening a note editor.
    // ─────────────────────────────────────────────
    socket.on('join-note', (noteId) => {
      socket.join(noteId);

      // Track active user for this note
      if (!activeUsers.has(noteId)) {
        activeUsers.set(noteId, new Map());
      }
      activeUsers.get(noteId).set(socket.user.id, socket.user);

      // Broadcast updated active users list to everyone in the room
      const users = Array.from(activeUsers.get(noteId).values());
      io.to(noteId).emit('active-users', users);

      console.log(`👤 ${socket.user.username} joined note: ${noteId}`);
    });

    // ─────────────────────────────────────────────
    // LEAVE NOTE ROOM
    // Client emits this when closing a note editor.
    // ─────────────────────────────────────────────
    socket.on('leave-note', (noteId) => {
      socket.leave(noteId);
      removeUserFromNote(noteId, socket.user.id, io);
    });

    // ─────────────────────────────────────────────
    // NOTE CONTENT UPDATE (real-time sync)
    // LWW strategy: broadcast to all peers in the room except sender.
    // ─────────────────────────────────────────────
    socket.on('note-update', ({ noteId, content, title }) => {
      // Broadcast to everyone in the room except the sender
      socket.to(noteId).emit('note-updated', {
        content,
        title,
        updatedBy: socket.user.username,
        updatedAt: new Date().toISOString(),
      });
    });

    // ─────────────────────────────────────────────
    // TYPING INDICATORS
    // ─────────────────────────────────────────────
    socket.on('typing-start', (noteId) => {
      socket.to(noteId).emit('user-typing', { username: socket.user.username });
    });

    socket.on('typing-stop', (noteId) => {
      socket.to(noteId).emit('user-stopped-typing', { username: socket.user.username });
    });

    // ─────────────────────────────────────────────
    // CURSOR POSITION SHARING (bonus feature)
    // ─────────────────────────────────────────────
    socket.on('cursor-move', ({ noteId, position }) => {
      socket.to(noteId).emit('cursor-update', {
        userId: socket.user.id,
        username: socket.user.username,
        position,
      });
    });

    // ─────────────────────────────────────────────
    // DISCONNECT
    // Clean up all rooms this socket was in.
    // ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id} | User: ${socket.user.username}`);

      // Remove user from all active note rooms they were in
      for (const [noteId] of activeUsers) {
        if (activeUsers.get(noteId)?.has(socket.user.id)) {
          removeUserFromNote(noteId, socket.user.id, io);
        }
      }
    });
  });
};

/**
 * Remove a user from a note's active users list and broadcast the update.
 */
const removeUserFromNote = (noteId, userId, io) => {
  if (activeUsers.has(noteId)) {
    activeUsers.get(noteId).delete(userId);

    const users = Array.from(activeUsers.get(noteId).values());
    io.to(noteId).emit('active-users', users);

    // Cleanup empty map entries
    if (activeUsers.get(noteId).size === 0) {
      activeUsers.delete(noteId);
    }
  }
};

module.exports = socketHandler;
