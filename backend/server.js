const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now, refine later
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// --- Game State Management ---
const games = {}; // Stores game sessions: { gameKey: { adminSocketId, players: { socketId: { name, rejoinCode, ... } }, ... } }

function generateGameKey() {
  let key;
  do {
    key = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4-character alphanumeric key
  } while (games[key]);
  return key;
}

// Basic Express route
app.get('/', (req, res) => {
  res.send('<h1>Game Server Running</h1>');
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Admin creates a new game
  socket.on('createGame', ({ timelineDays, location, questions }, callback) => {
    const gameKey = generateGameKey();
    games[gameKey] = {
      adminSocketId: socket.id,
      players: {},
      state: 'waiting', // waiting, playing, finished
      timelineDays,
      location,
      questions,
      currentQuestionIndex: 0, // Start with the first question
      // Add other game-specific state here
    };
    socket.join(gameKey); // Admin joins the game room
    console.log(`Game created: ${gameKey} by admin ${socket.id} with ${questions.length} questions.`);
    if (callback) callback({ success: true, gameKey });
  });

  // Admin saves the game (placeholder for persistence)
  socket.on('saveGame', ({ gameKey }, callback) => {
    // In a real application, you would save the game state to a database here.
    // For now, it's just an in-memory object.
    console.log(`Game ${gameKey} saved by admin ${socket.id}. (In-memory only)`);
    if (callback) callback({ success: true });
  });

  // Admin deletes the game
  socket.on('deleteGame', ({ gameKey }, callback) => {
    const game = games[gameKey];
    if (game && game.adminSocketId === socket.id) {
      io.to(gameKey).emit('gameEnded', { gameKey, message: 'Admin deleted the game.' });
      delete games[gameKey];
      console.log(`Game ${gameKey} deleted by admin ${socket.id}.`);
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, message: 'Game not found or not authorized.' });
    }
  });

  // Player joins a game for the first time
  socket.on('joinGame', ({ gameKey, playerName, rejoinCode }, callback) => {
    const game = games[gameKey];
    if (!game) {
      if (callback) callback({ success: false, message: 'Game not found' });
      return;
    }
    if (game.players[socket.id]) {
      if (callback) callback({ success: false, message: 'Already joined this game' });
      return;
    }

    // Check if rejoinCode is unique for this game
    const rejoinCodeExists = Object.values(game.players).some(player => player.rejoinCode === rejoinCode);
    if (rejoinCodeExists) {
      if (callback) callback({ success: false, message: 'Rejoin code already in use' });
      return;
    }

    game.players[socket.id] = {
      name: playerName,
      rejoinCode: rejoinCode,
      socketId: socket.id,
      // Add other player-specific state here
    };
    socket.join(gameKey); // Player joins the game room
    console.log(`Player ${playerName} (${socket.id}) joined game ${gameKey} with rejoin code ${rejoinCode}`);

    // Notify admin and other players
    io.to(game.adminSocketId).emit('playerJoined', { id: socket.id, name: playerName });
    socket.to(gameKey).emit('playerJoined', { id: socket.id, name: playerName }); // Notify others in the room

    if (callback) callback({ success: true, gameKey, playerId: socket.id });
  });

  // Player rejoins a game
  socket.on('rejoinGame', ({ gameKey, rejoinCode }, callback) => {
    const game = games[gameKey];
    if (!game) {
      if (callback) callback({ success: false, message: 'Game not found' });
      return;
    }

    const playerToRejoin = Object.values(game.players).find(player => player.rejoinCode === rejoinCode);

    if (!playerToRejoin) {
      if (callback) callback({ success: false, message: 'Invalid rejoin code' });
      return;
    }

    // Update the player's socket ID to the new one
    const oldSocketId = playerToRejoin.socketId;
    playerToRejoin.socketId = socket.id;
    game.players[socket.id] = playerToRejoin; // Add new socket ID
    delete game.players[oldSocketId]; // Remove old socket ID

    socket.join(gameKey); // Player joins the game room
    console.log(`Player ${playerToRejoin.name} (${socket.id}) rejoined game ${gameKey}`);

    // Notify admin and other players about the reconnected player
    io.to(game.adminSocketId).emit('playerRejoined', { id: socket.id, name: playerToRejoin.name, oldId: oldSocketId });
    socket.to(gameKey).emit('playerRejoined', { id: socket.id, name: playerToRejoin.name, oldId: oldSocketId });

    if (callback) callback({ success: true, gameKey, playerId: socket.id, playerName: playerToRejoin.name });
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find if the disconnected socket was an admin or a player in any game
    for (const gameKey in games) {
      const game = games[gameKey];
      if (game.adminSocketId === socket.id) {
        console.log(`Admin ${socket.id} disconnected from game ${gameKey}. Game ended.`);
        io.to(gameKey).emit('gameEnded', { gameKey, message: 'Admin disconnected' });
        delete games[gameKey]; // End game if admin disconnects
        break;
      }
      if (game.players[socket.id]) {
        const playerName = game.players[socket.id].name;
        console.log(`Player ${playerName} (${socket.id}) disconnected from game ${gameKey}`);
        delete game.players[socket.id];
        // Notify admin and other players
        io.to(game.adminSocketId).emit('playerLeft', { id: socket.id, name: playerName });
        socket.to(gameKey).emit('playerLeft', { id: socket.id, name: playerName });
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
