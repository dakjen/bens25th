import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Alert, Image, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:8082'; // Replace with your backend server URL

export default function App() {
  const [socket, setSocket] = useState(null);
  const [gameKey, setGameKey] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [rejoinCode, setRejoinCode] = useState('');
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'admin', 'player', 'game'
  const [playersInGame, setPlayersInGame] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timelineDays, setTimelineDays] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('playerJoined', (player) => {
      console.log('Player joined:', player);
      setPlayersInGame(prev => [...prev, player]);
    });

    newSocket.on('playerLeft', (player) => {
      console.log('Player left:', player);
      setPlayersInGame(prev => prev.filter(p => p.id !== player.id));
    });

    newSocket.on('playerRejoined', ({ id, name, oldId }) => {
      console.log('Player rejoined:', { id, name, oldId });
      setPlayersInGame(prev => prev.map(p => p.id === oldId ? { ...p, id: id } : p));
    });

    newSocket.on('gameEnded', ({ message }) => {
      Alert.alert('Game Ended', message);
      setCurrentScreen('home');
      setGameKey('');
      setPlayerName('');
      setRejoinCode('');
      setPlayersInGame([]);
      setIsAdmin(false);
      setTimelineDays(''); // Clear timeline days on game end
      setLocation(''); // Clear location on game end
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => newSocket.disconnect();
  }, []);

  const handleCreateGame = () => {
    if (socket) {
      if (!timelineDays || !location) {
        Alert.alert('Error', 'Please enter timeline days and location.');
        return;
      }
      socket.emit('createGame', { timelineDays: parseInt(timelineDays), location }, ({ success, gameKey: newGameKey }) => {
        if (success) {
          setGameKey(newGameKey);
          setIsAdmin(true);
          setCurrentScreen('game');
          setPlayersInGame([]); // Admin is not a 'player' in this list initially
          Alert.alert('Game Created', `Share this key: ${newGameKey}`);
        } else {
          Alert.alert('Error', 'Failed to create game');
        }
      });
    }
  };

  const handleJoinGame = () => {
    if (socket && gameKey && playerName && rejoinCode) {
      socket.emit('joinGame', { gameKey, playerName, rejoinCode }, ({ success, message }) => {
        if (success) {
          setCurrentScreen('game');
          setIsAdmin(false);
          Alert.alert('Joined Game', `Welcome, ${playerName}!`);
        } else {
          Alert.alert('Error', message || 'Failed to join game');
        }
      });
    }
  };

  const handleRejoinGame = () => {
    if (socket && gameKey && rejoinCode) {
      socket.emit('rejoinGame', { gameKey, rejoinCode }, ({ success, message, playerName: rejoinedPlayerName }) => {
        if (success) {
          setPlayerName(rejoinedPlayerName || 'Player'); // Set player name if rejoined
          setCurrentScreen('game');
          setIsAdmin(false);
          Alert.alert('Rejoined Game', `Welcome back, ${rejoinedPlayerName || 'Player'}!`);
        } else {
          Alert.alert('Error', message || 'Failed to rejoin game');
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Benjamin's 25th Birthday</Text>
      <Text style={styles.subtitle}>the frontal lobe develops. the scavenger hunt begins</Text>

      <StatusBar style="auto" />

      {currentScreen === 'home' && (
        <View>
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('admin')}>
              <Text style={styles.buttonText}>Create Game (Admin)</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('player')}>
              <Text style={styles.buttonText}>Join Game (Player)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentScreen === 'admin' && (
        <View>
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('home')}>
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Timeline (days)"
            value={timelineDays}
            onChangeText={setTimelineDays}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
          />
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={handleCreateGame}>
              <Text style={styles.buttonText}>Create New Game</Text>
            </TouchableOpacity>
          </View>
          {gameKey ? <Text style={styles.gameKeyText}>Game Key: {gameKey}</Text> : null}
        </View>
      )}

      {currentScreen === 'player' && (
        <View>
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('home')}>
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Game Key"
            value={gameKey}
            onChangeText={setGameKey}
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            value={playerName}
            onChangeText={setPlayerName}
          />
          <TextInput
            style={styles.input}
            placeholder="4-digit Rejoin Code (e.g., 1234)"
            value={rejoinCode}
            onChangeText={setRejoinCode}
            keyboardType="numeric"
            maxLength={4}
          />
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={handleJoinGame}>
              <Text style={styles.buttonText}>Join Game</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={handleRejoinGame}>
              <Text style={styles.buttonText}>Rejoin Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentScreen === 'game' && (
        <View>
          <Text style={styles.gameKeyText}>Game Key: {gameKey}</Text>
          {isAdmin ? (
            <Text style={styles.gameKeyText}>You are the Admin</Text>
          ) : (
            <Text style={styles.gameKeyText}>Playing as: {playerName}</Text>
          )}
          <Text style={styles.gameKeyText}>Players in Game:</Text>
          {playersInGame.length === 0 ? (
            <Text style={styles.gameKeyText}>No players yet.</Text>
          ) : (
            playersInGame.map((player, index) => (
              <Text key={index} style={styles.gameKeyText}>- {player.name} ({player.id})</Text>
            ))
          )}
          {/* Add game specific UI here */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#155591',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5, // Reduced margin to bring subtitle closer
    color: '#ececec',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#ececec',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  buttonSpacing: {
    marginBottom: 15, // Add vertical spacing between buttons
  },
  mainImage: {
    width: 200, // Example width
    height: 200, // Example height
    resizeMode: 'contain', // or 'cover', 'stretch'
    marginBottom: 20,
  },
  gameKeyText: {
    fontSize: 18,
    marginVertical: 10,
    color: '#ececec',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    width: '80%',
    backgroundColor: '#fff',
    color: '#333',
  },
  button: {
    backgroundColor: '#6f9a7d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200, // Example width, adjust as needed
  },
  buttonText: {
    color: '#ececec',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
