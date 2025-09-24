import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Alert, Image, TouchableOpacity } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { useFonts } from 'expo-font';
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const SOCKET_SERVER_URL = 'http://localhost:8082'; // Replace with your backend server URL

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    PermanentMarker_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }
  const [socket, setSocket] = useState(null);
  const [gameKey, setGameKey] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [rejoinCode, setRejoinCode] = useState('');
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'admin', 'player', 'game'
  const [adminScreenStep, setAdminScreenStep] = useState('initial'); // 'initial', 'questions'
  const [adminQuestionStep, setAdminQuestionStep] = useState('add'); // 'add', 'manage'
  const [playersInGame, setPlayersInGame] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timelineDays, setTimelineDays] = useState('');
  const [location, setLocation] = useState('');
  const [questions, setQuestions] = useState([]); // Each question will be { questionText, imageUrl, caption }
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentCaption, setCurrentCaption] = useState('');
  const [bulkQuestionText, setBulkQuestionText] = useState('');
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');

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
      setQuestions([]); // Clear questions on game end
      setCurrentQuestionText('');
      setBulkQuestionText(''); // Clear bulk question text on game end
      setAdminScreenStep('initial'); // Reset admin screen step
      setEditingQuestionIndex(null);
      setEditingQuestionText('');
      setCurrentImageUrl(null);
      setCurrentCaption('');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => newSocket.disconnect();
  }, []);

  const handleProceedToQuestions = () => {
    if (!timelineDays || !location) {
      Alert.alert('Error', 'Please enter timeline days and location.');
      return;
    }
    setAdminScreenStep('questions');
  };

  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setCurrentImageUrl(result.assets[0].uri);
    }
  };

  const handleAddQuestion = () => {
    if (currentQuestionText) {
      setQuestions(prev => [...prev, { questionText: currentQuestionText, imageUrl: currentImageUrl, caption: currentCaption }]);
      setCurrentQuestionText('');
      setCurrentImageUrl(null);
      setCurrentCaption('');
    } else {
      Alert.alert('Error', 'Please enter a question.');
    }
  };

  const handleParseAndAddQuestions = () => {
    if (bulkQuestionText) {
      const parsedQuestions = bulkQuestionText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (parsedQuestions.length > 0) {
        // For bulk added questions, image and caption will be null/empty
        const newQuestions = parsedQuestions.map(qText => ({ questionText: qText, imageUrl: null, caption: '' }));
        setQuestions(prev => [...prev, ...newQuestions]);
        setBulkQuestionText('');
      } else {
        Alert.alert('Error', 'No valid questions found in the pasted text.');
      }
    } else {
      Alert.alert('Error', 'Please paste questions into the bulk entry field.');
    }
  };

  const handleDeleteQuestion = (indexToDelete) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => {
            setQuestions(prev => prev.filter((_, index) => index !== indexToDelete));
          }, style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  const handleEditQuestion = (index) => {
    setEditingQuestionIndex(index);
    setEditingQuestionText(questions[index].questionText);
    setCurrentImageUrl(questions[index].imageUrl);
    setCurrentCaption(questions[index].caption);
  };

  const handleSaveEditedQuestion = () => {
    if (editingQuestionIndex !== null && editingQuestionText) {
      setQuestions(prev => prev.map((q, index) => index === editingQuestionIndex ? { questionText: editingQuestionText, imageUrl: currentImageUrl, caption: currentCaption } : q));
      setEditingQuestionIndex(null);
      setEditingQuestionText('');
      setCurrentImageUrl(null);
      setCurrentCaption('');
    } else {
      Alert.alert('Error', 'Please enter a valid question text.');
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestionIndex(null);
    setEditingQuestionText('');
    setCurrentImageUrl(null);
    setCurrentCaption('');
  };

  const handleFinishGameSetup = () => {
    if (socket) {
      if (questions.length === 0) {
        Alert.alert('Error', 'Please add at least one question.');
        return;
      }
      socket.emit('createGame', { timelineDays: parseInt(timelineDays), location, questions }, ({ success, gameKey: newGameKey }) => {
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

  const handleSaveGame = () => {
    if (socket && gameKey) {
      socket.emit('saveGame', { gameKey }, ({ success }) => {
        if (success) {
          Alert.alert('Game Saved', 'Game state saved successfully!');
        } else {
          Alert.alert('Error', 'Failed to save game.');
        }
      });
    }
  };

  const handleDeleteGame = () => {
    if (socket && gameKey) {
      Alert.alert(
        'Delete Game',
        'Are you sure you want to delete this game? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: () => {
              socket.emit('deleteGame', { gameKey }, ({ success, message }) => {
                if (success) {
                  Alert.alert('Game Deleted', 'Game deleted successfully.');
                  setCurrentScreen('home'); // Go back to home screen
                  setGameKey('');
                  setIsAdmin(false);
                } else {
                  Alert.alert('Error', message || 'Failed to delete game.');
                }
              });
            }, style: 'destructive' },
        ],
        { cancelable: true }
      );
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
    <View style={styles.container} onLayout={onLayoutRootView}>
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

      {currentScreen === 'admin' && adminScreenStep === 'initial' && (
        <View style={{ paddingVertical: 20 }}>
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
            <TouchableOpacity style={styles.button} onPress={handleProceedToQuestions}>
              <Text style={styles.buttonText}>Proceed to Questions</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentScreen === 'admin' && adminScreenStep === 'questions' && adminQuestionStep === 'add' && (
        <View style={{ paddingVertical: 20 }}>
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={() => setAdminScreenStep('initial')}>
              <Text style={styles.buttonText}>Back to Game Details</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.gameKeyText}>Add Questions</Text>
          <TextInput
            style={styles.input}
            placeholder="Question Text"
            value={currentQuestionText}
            onChangeText={setCurrentQuestionText}
          />
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={handleImagePick}>
              <Text style={styles.buttonText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>
          {currentImageUrl && <Image source={{ uri: currentImageUrl }} style={styles.uploadedImage} />}
          <TextInput
            style={styles.input}
            placeholder="Caption (optional)"
            value={currentCaption}
            onChangeText={setCurrentCaption}
          />
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={handleAddQuestion}>
              <Text style={styles.buttonText}>Add Question</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Paste multiple questions here (one per line)"
            value={bulkQuestionText}
            onChangeText={setBulkQuestionText}
            multiline
            numberOfLines={4}
          />
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={handleParseAndAddQuestions}>
              <Text style={styles.buttonText}>Parse and Add Questions</Text>
            </TouchableOpacity>
          </View>

          {questions.length > 0 && (
            <View>
              <Text style={styles.gameKeyText}>Current Questions:</Text>
              {questions.map((q, index) => (
                <View key={index} style={styles.questionItem}>
                  <Text style={styles.gameKeyText}>{index + 1}. {q.questionText}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={() => setAdminQuestionStep('manage')}>
              <Text style={styles.buttonText}>Next (Manage Questions)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {currentScreen === 'admin' && adminScreenStep === 'questions' && adminQuestionStep === 'manage' && (
        <View style={{ paddingVertical: 20 }}>
          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={() => setAdminQuestionStep('add')}>
              <Text style={styles.buttonText}>Back (Add More Questions)</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.gameKeyText}>Manage Questions</Text>
          {questions.length === 0 ? (
            <Text style={styles.gameKeyText}>No questions added yet.</Text>
          ) : (
            questions.map((q, index) => (
              <View key={index} style={styles.questionItem}>
                {editingQuestionIndex === index ? (
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 10 }]} // Added flex: 1 to allow TextInput to grow
                      value={editingQuestionText}
                      onChangeText={setEditingQuestionText}
                    />
                    {currentImageUrl && <Image source={{ uri: currentImageUrl }} style={styles.uploadedImage} />}
                    <View style={styles.buttonSpacing}>
                      <TouchableOpacity style={styles.button} onPress={handleImagePick}>
                        <Text style={styles.buttonText}>Change Photo</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Caption (optional)"
                      value={currentCaption}
                      onChangeText={setCurrentCaption}
                    />
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gameKeyText}>{index + 1}. {q.questionText}</Text>
                    {q.imageUrl && <Image source={{ uri: q.imageUrl }} style={styles.uploadedImage} />}
                    {q.caption && <Text style={styles.gameKeyText}>Caption: {q.caption}</Text>}
                  </View>
                )}
                <View style={{ flexDirection: 'row' }}>
                  {editingQuestionIndex === index ? (
                    <>
                      <TouchableOpacity onPress={handleSaveEditedQuestion}>
                        <Text style={styles.editSaveButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelEdit}>
                        <Text style={styles.editCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => handleEditQuestion(index)}>
                        <Text style={styles.editSaveButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteQuestion(index)}>
                        <Text style={styles.deleteButtonText}>X</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          <View style={styles.buttonSpacing}>
            <TouchableOpacity style={styles.button} onPress={handleFinishGameSetup}>
              <Text style={styles.buttonText}>Finish Game Setup</Text>
            </TouchableOpacity>
          </View>
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
            maxLength={6}
          />
          <TextInput
            style={styles.input}
            placeholder="Who are you?"
            value={playerName}
            onChangeText={setPlayerName}
          />
          <TextInput
            style={styles.input}
            placeholder="4-digit Rejoin Code (e.g., 1234)"
            value={rejoinCode}
            onChangeText={(text) => setRejoinCode(text.replace(/[^0-9]/g, ''))} // Filter non-numeric
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
            <View>
              <Text style={styles.gameKeyText}>You are the Admin</Text>
              <View style={styles.buttonSpacing}>
                <TouchableOpacity style={styles.button} onPress={handleSaveGame}>
                  <Text style={styles.buttonText}>Save Game</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.buttonSpacing}>
                <TouchableOpacity style={styles.button} onPress={handleDeleteGame}>
                  <Text style={styles.buttonText}>Delete Game</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    fontFamily: 'PermanentMarker_400Regular',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#ececec',
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
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
    marginVertical: 15, // Increased vertical margin
    color: '#ececec',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15, // Increased vertical margin
    paddingHorizontal: 10,
    width: '80%',
    backgroundColor: '#fff',
    color: '#333',
  },
  multilineInput: {
    height: 100, // Taller for bulk input
    textAlignVertical: 'top', // Align text to top for multiline
    paddingVertical: 10,
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
    fontFamily: 'Manrope_700Bold',
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    marginBottom: 5,
  },
  deleteButtonText: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  editSaveButtonText: {
    color: 'blue',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  editCancelButtonText: {
    color: 'orange',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
  },
  uploadedImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginTop: 10,
    marginBottom: 10,
  },
});
