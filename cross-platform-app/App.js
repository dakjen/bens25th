import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View, TextInput, Button, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { useFonts } from 'expo-font';
import { Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import * as SplashScreen from 'expo-splash-screen';
import * as ImagePicker from 'expo-image-picker'; // Added ImagePicker import

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const SOCKET_SERVER_URL = 'https://bens25th.onrender.com'; // Replace with your backend server URL

export default function App() {
  const [socket, setSocket] = useState(null);
  const [gameKey, setGameKey] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [rejoinCode, setRejoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'admin', 'player', 'game'
  const [adminScreenStep, setAdminScreenStep] = useState('initial'); // 'initial', 'questions'
  const [adminQuestionStep, setAdminQuestionStep] = useState('add'); // 'add', 'manage'
  const [adminGameView, setAdminGameView] = useState('overview'); // 'overview', 'reviewAnswers' // NEW
  const [playersInGame, setPlayersInGame] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timelineDays, setTimelineDays] = useState('');
  const [location, setLocation] = useState('');
  const [questions, setQuestions] = useState([]); // Each question will be { questionText, imageUrl, caption, category, expectedAnswer }
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentCaption, setCurrentCaption] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [bulkQuestionText, setBulkQuestionText] = useState('');
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [showCongratulationsPage, setShowCongratulationsPage] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [playerTextAnswer, setPlayerTextAnswer] = useState('');
  const [playerImageUri, setPlayerImageUri] = useState(null);
  const [submittedAnswers, setSubmittedAnswers] = useState([]);
  const [adminEnteredGameKey, setAdminEnteredGameKey] = useState(''); // NEW
  const [selectedAnswerForReview, setSelectedAnswerForReview] = useState(null);
  const [currentScore, setCurrentScore] = useState('');
  const [teamScores, setTeamScores] = useState({}); // NEW
  const [playerScore, setPlayerScore] = useState(0); // NEW
  const [teamAnswers, setTeamAnswers] = useState({}); // NEW
  const [showAdminLogin, setShowAdminLogin] = useState(false); // NEW
  const [adminPassword, setAdminPassword] = useState(''); // NEW

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

    newSocket.on('gameData', ({ questions: gameQuestions }) => {
      setQuestions(gameQuestions);
      console.log('Received game data:', gameQuestions);
    });

    newSocket.on('submittedAnswersUpdate', (answers) => {
      setSubmittedAnswers(answers);
      console.log('Received submitted answers update:', answers);
    });

    newSocket.on('teamScoresUpdate', (scores) => {
      setTeamScores(scores);
      console.log('Received team scores update:', scores);
    });

    newSocket.on('playerScoresUpdate', (score) => {
      setPlayerScore(score);
      console.log('Received player score update:', score);
    });

    newSocket.on('teamAnswersUpdate', (answers) => {
      setTeamAnswers(answers);
      console.log('Received team answers update:', answers);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => newSocket.disconnect();
  }, []);

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

  const handlePlayerImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setPlayerImageUri(result.assets[0].uri);
    }
  };

  const handleSubmitAnswer = () => {
    if (!playerTextAnswer && !playerImageUri) {
      Alert.alert('Error', 'Please provide either a text answer or upload a photo.');
      return;
    }

    if (socket && selectedQuestion) {
      socket.emit('submitAnswer', {
        gameKey,
        playerName,
        teamName,
        questionId: selectedQuestion.id, // Assuming questions have an 'id'
        submittedTextAnswer: playerTextAnswer,
        submittedImageUri: playerImageUri,
      }, ({ success, message }) => {
        if (success) {
          Alert.alert('Success', 'Answer submitted for review!');
          setPlayerTextAnswer('');
          setPlayerImageUri(null);
          setSelectedQuestion(null); // Go back to clue list
          // TODO: Update UI to mark question as answered
        } else {
          Alert.alert('Error', message || 'Failed to submit answer.');
        }
      });
    }
  };

  const handleReviewAnswer = (answerId, status) => {
    if (socket) {
      socket.emit('reviewAnswer', { gameKey, answerId, status }, ({ success, message }) => {
        if (success) {
          Alert.alert('Success', `Answer marked as ${status}!`);
          // The submittedAnswersUpdate listener will refresh the list
        } else {
          Alert.alert('Error', message || 'Failed to review answer.');
        }
      });
    }
  };

  const handleSaveScore = (answerId, score) => {
    if (socket) {
      socket.emit('saveScore', { gameKey, answerId, score: parseInt(score) }, ({ success, message }) => {
        if (success) {
          Alert.alert('Success', 'Score saved!');
          setSelectedAnswerForReview(null); // Go back to all answers
          setCurrentScore(''); // Clear score input
          // The submittedAnswersUpdate listener will refresh the list
        } else {
          Alert.alert('Error', message || 'Failed to save score.');
        }
      });
    }
  };

  const handleAddQuestion = () => {
    if (currentQuestionText) {
      setQuestions(prev => [...prev, {
        questionText: currentQuestionText,
        imageUrl: currentImageUrl,
        caption: currentCaption,
        category: currentCategory,
        expectedAnswer: expectedAnswer
      }]);
      setCurrentQuestionText('');
      setCurrentImageUrl(null);
      setCurrentCaption('');
      setCurrentCategory('');
      setExpectedAnswer('');
    } else {
      Alert.alert('Error', 'Please enter a question.');
    }
  };

  const handleParseAndAddQuestions = () => {
    if (bulkQuestionText) {
      const parsedQuestions = bulkQuestionText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (parsedQuestions.length > 0) {
        // For bulk added questions, image, caption, category, and expectedAnswer will be null/empty
        const newQuestions = parsedQuestions.map(qText => ({ questionText: qText, imageUrl: null, caption: '', category: '', expectedAnswer: '' }));
        setQuestions(prev => [...prev, ...newQuestions]);
        setBulkQuestionText('');
      } else {
        Alert.alert('Error', 'No valid questions found in the pasted text.');
      }
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
    setCurrentCategory(questions[index].category);
    setExpectedAnswer(questions[index].expectedAnswer);
  };

  const handleSaveEditedQuestion = () => {
    if (editingQuestionIndex !== null && editingQuestionText) {
      setQuestions(prev => prev.map((q, index) => index === editingQuestionIndex ? {
        questionText: editingQuestionText,
        imageUrl: currentImageUrl,
        caption: currentCaption,
        category: currentCategory,
        expectedAnswer: expectedAnswer
      } : q));
      setEditingQuestionIndex(null);
      setEditingQuestionText('');
      setCurrentImageUrl(null);
      setCurrentCaption('');
      setCurrentCategory('');
      setExpectedAnswer('');
    } else {
      Alert.alert('Error', 'Please enter a valid question text.');
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestionIndex(null);
    setEditingQuestionText('');
    setCurrentImageUrl(null);
    setCurrentCaption('');
    setCurrentCategory('');
    setExpectedAnswer('');
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'bensbdayadmin') { // Replace with actual password logic
      setCurrentScreen('adminGameKeyEntry'); // Navigate to game key entry for review
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      Alert.alert('Error', 'Incorrect Admin Password');
    }
  };

  const handleProceedToAdminReview = () => {
    if (adminEnteredGameKey) {
      // In a real app, you'd validate this game key with the backend
      // For now, we'll just assume it's valid and proceed
      setGameKey(adminEnteredGameKey); // Set the game key for the admin session
      setCurrentScreen('game'); // Transition to the game screen
      setIsAdmin(true); // Set admin status
      setAdminGameView('reviewAnswers'); // Go directly to review answers
      setAdminEnteredGameKey(''); // Clear the input
    } else {
      Alert.alert('Error', 'Please enter a Game Key.');
    }
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
    if (!gameKey || !playerName || !rejoinCode || !teamName) {
      Alert.alert('Error', 'Please fill in all fields (Game Key, Who are you?, Team Name, Rejoin Code).');
      return;
    }
    if (socket) {
      socket.emit('joinGame', { gameKey, playerName, rejoinCode, teamName }, ({ success, message }) => {
        if (success) {
          setCurrentScreen('game');
          setIsAdmin(false);
          Alert.alert('Joined Game', `Welcome, ${playerName} of Team ${teamName}!`);
        } else {
          Alert.alert('Error', message || 'Failed to join game');
        }
      });
    }
  };

  const handleRejoinGame = () => {
    if (!gameKey || !rejoinCode || !teamName) {
      Alert.alert('Error', 'Please fill in all fields (Game Key, Team Name, Rejoin Code).');
      return;
    }
    if (socket) {
      socket.emit('rejoinGame', { gameKey, rejoinCode, teamName }, ({ success, message, playerName: rejoinedPlayerName }) => {
        if (success) {
          setPlayerName(rejoinedPlayerName || 'Player'); // Set player name if rejoined
          setCurrentScreen('game');
          setIsAdmin(false);
          Alert.alert('Rejoined Game', `Welcome back, ${rejoinedPlayerName || 'Player'} of Team ${teamName}!`);
        } else {
          Alert.alert('Error', message || 'Failed to rejoin game');
        }
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
      {showCongratulationsPage && (
        <View style={styles.congratulationsContainer}>
          <Text style={styles.congratulationsText}>Congratulations!</Text>
          <TouchableOpacity style={styles.button} onPress={() => setShowCongratulationsPage(false)}>
            <Text style={styles.buttonText}>Go Back to Home</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showCongratulationsPage && (
        <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Benjamin's 25th Birthday</Text>
          <View>
            <Text style={styles.subtitle}>the frontal lobe develops.</Text>
            <Text style={styles.subtitle}>The scavenger hunt begins.</Text>
          </View>

          <StatusBar style="auto" />

          {currentScreen === 'home' && (
            <View style={{ alignItems: 'center' }}>
              <Image source={require('./assets/benfunnyhs.jpg')} style={styles.homeScreenImage} />
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
              <View style={styles.buttonSpacing}> {/* NEW */}
                <TouchableOpacity style={styles.button} onPress={() => setShowAdminLogin(true)}> {/* NEW */}
                  <Text style={styles.buttonText}>Admin Login</Text> {/* NEW */}
                </TouchableOpacity> {/* NEW */}
              </View> {/* NEW */}
            </View>
          )}

          {showAdminLogin && (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={styles.gameKeyText}>Admin Login</Text>
              <TextInput
                style={styles.input}
                placeholder="Admin Password"
                secureTextEntry={true}
                value={adminPassword}
                onChangeText={setAdminPassword}
              />
              <View style={styles.buttonSpacing}>
                <TouchableOpacity style={styles.button} onPress={handleAdminLogin}>
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.buttonSpacing}>
                <TouchableOpacity style={styles.button} onPress={() => setShowAdminLogin(false)}>
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentScreen === 'adminGameKeyEntry' && (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={styles.gameKeyText}>Enter Game Key for Admin Review</Text>
              <TextInput
                style={styles.input}
                placeholder="Game Key"
                value={adminEnteredGameKey}
                onChangeText={setAdminEnteredGameKey}
                autoCapitalize="characters"
                maxLength={6}
              />
              <View style={styles.buttonSpacing}>
                <TouchableOpacity style={styles.button} onPress={handleProceedToAdminReview}>
                  <Text style={styles.buttonText}>Proceed to Review</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.buttonSpacing}>
                <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('home')}>
                  <Text style={styles.buttonText}>Back to Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentScreen === 'admin' && adminScreenStep === 'initial' && (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Image source={require('./assets/france.jpeg')} style={styles.homeScreenImage} />
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
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
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
              <TextInput
                style={styles.input}
                placeholder="Category (e.g., 'History', 'Science')"
                value={currentCategory}
                onChangeText={setCurrentCategory}
              />
              <TextInput
                style={styles.input}
                placeholder="Expected Answer (for admin review)"
                value={expectedAnswer}
                onChangeText={setExpectedAnswer}
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
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <View style={styles.buttonSpacing}>
                <TouchableOpacity style={styles.button} onPress={() => setAdminQuestionStep('add')}>
                  <Text style={styles.buttonText}>Back (Add More Questions)</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.gameKeyText}>Manage Questions</Text>
              {questions.length === 0 ? (
                <Text style={styles.gameKeyText}>No questions added yet.</Text>
              ) : (
                <>
                  {questions.map((q, index) => (
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
                  ))}
                </>
              )}

            <View style={styles.buttonSpacing}>
              <TouchableOpacity style={styles.button} onPress={handleFinishGameSetup}>
                <Text style={styles.buttonText}>Finish Game Setup</Text>
              </TouchableOpacity>
            </View>
          </View>
          )}

          {currentScreen === 'player' && (
            <View style={{ alignItems: 'center' }}>
              <Image source={require('./assets/oldben.jpg')} style={styles.homeScreenImage} />
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
                placeholder="Team Name"
                value={teamName}
                onChangeText={setTeamName}
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
            <View style={styles.gameContainer}> {/* NEW: Use a dedicated style for game screen */}
              <Text style={styles.gameKeyText}>Game Key: {gameKey}</Text>
              <> {/* NEW Fragment */}
                {isAdmin ? (
                  <>
                    {adminGameView === 'overview' && (
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
                        <View style={styles.buttonSpacing}>
                          <TouchableOpacity style={styles.button} onPress={() => setAdminGameView('reviewAnswers')}>
                            <Text style={styles.buttonText}>Review Answers</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {adminGameView === 'reviewAnswers' && (
                      <ScrollView style={styles.reviewAnswersContainer}>
                        <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('adminGameKeyEntry')}>
                          <Text style={styles.buttonText}>Back to Game Key Entry</Text>
                        </TouchableOpacity>
                        <Text style={styles.gameKeyText}>Submitted Answers for Review (Game Key: {gameKey})</Text>
                        {submittedAnswers.length === 0 ? (
                          <Text style={styles.gameKeyText}>No answers submitted yet.</Text>
                        ) : (
                          Object.entries(
                            submittedAnswers.reduce((acc, answer) => {
                              (acc[answer.teamName] = acc[answer.teamName] || []).push(answer);
                              return acc;
                            }, {})
                          ).map(([teamName, teamAnswers]) => (
                            <View key={teamName} style={styles.teamAnswersContainer}>
                              <Text style={styles.teamNameTitle}>Team: {teamName}</Text>
                              {teamAnswers.map((answer, ansIndex) => (
                                <View key={ansIndex} style={styles.submittedAnswerItem}>
                                  <TouchableOpacity onPress={() => setSelectedAnswerForReview(selectedAnswerForReview === answer ? null : answer)}>
                                    <Text style={styles.clueItemText}>Question: {answer.questionText}</Text>
                                    {answer.submittedTextAnswer && <Text style={styles.clueItemText}>Submitted Text: {answer.submittedTextAnswer}</Text>}
                                    {answer.submittedImageUri && <Image source={{ uri: answer.submittedImageUri }} style={styles.uploadedImage} />}
                                    <Text style={styles.clueItemText}>Expected: {answer.expectedAnswer}</Text>
                                    <Text style={styles.clueItemText}>Status: {answer.status || 'Pending'}</Text>
                                  </TouchableOpacity>

                                  {selectedAnswerForReview === answer && (
                                    <View style={styles.detailedAnswerInlineContainer}>
                                      {answer.status === 'pending' && (
                                        <View style={styles.reviewButtonsContainer}>
                                          <TouchableOpacity style={styles.reviewButtonCorrect} onPress={() => handleReviewAnswer(answer.id, 'correct')}>
                                            <Text style={styles.buttonText}>Mark Correct</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity style={styles.reviewButtonIncorrect} onPress={() => handleReviewAnswer(answer.id, 'incorrect')}>
                                            <Text style={styles.buttonText}>Mark Incorrect</Text>
                                          </TouchableOpacity>
                                        </View>
                                      )}
                                      <TextInput
                                        style={styles.input}
                                        placeholder="Score 1-5"
                                        value={currentScore}
                                        onChangeText={setCurrentScore}
                                        keyboardType="numeric"
                                      />
                                      <View style={styles.buttonSpacing}>
                                        <TouchableOpacity style={styles.button} onPress={() => handleSaveScore(answer.id, currentScore)}>
                                          <Text style={styles.buttonText}>Save Score</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              ))}
                            </View>
                          ))
                        )}
                      </ScrollView>
                    )}
                  </>
                ) : (
                  <View>
                    <Text style={styles.gameKeyText}>Playing as: {playerName} of Team {teamName}</Text>
                    <Text style={styles.gameKeyText}>Your Score: {playerScore} points</Text>
                    {selectedQuestion ? (
                      // Clue Detail View
                      <View style={styles.clueDetailContainer}>
                        <Text style={styles.clueDetailText}>{selectedQuestion.questionText}</Text>
                        {selectedQuestion.imageUrl && <Image source={{ uri: selectedQuestion.imageUrl }} style={styles.clueImage} />}
                        {selectedQuestion.caption && <Text style={styles.clueCaption}>{selectedQuestion.caption}</Text>}

                        {/* Answer Input */}
                        <TextInput
                          style={styles.input}
                          placeholder="Your text answer"
                          value={playerTextAnswer}
                          onChangeText={setPlayerTextAnswer}
                        />
                        <TouchableOpacity style={styles.button} onPress={handlePlayerImagePick}>
                          <Text style={styles.buttonText}>Upload Photo</Text>
                        </TouchableOpacity>
                        {playerImageUri && <Image source={{ uri: playerImageUri }} style={styles.uploadedImage} />}

                        <TouchableOpacity style={styles.button} onPress={handleSubmitAnswer}>
                          <Text style={styles.buttonText}>Submit Answer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={() => setSelectedQuestion(null)}>
                          <Text style={styles.buttonText}>Back to Clues</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // Category and Clue List
                      <ScrollView style={styles.clueListContainer}>
                        {Object.entries(
                          questions.reduce((acc, question) => {
                            (acc[question.category] = acc[question.category] || []).push(question);
                            return acc;
                          }, {})
                        ).map(([category, categoryQuestions]) => (
                          <View key={category} style={styles.categoryContainer}>
                            <Text style={styles.categoryTitle}>{category || 'Uncategorized'}</Text>
                            {categoryQuestions.map((question, qIndex) => (
                              <TouchableOpacity
                                key={qIndex}
                                style={[styles.clueItem, teamAnswers[question.id] && styles.clueItemAnswered]}
                                onPress={() => setSelectedQuestion(question)}
                              >
                                <Text style={styles.clueItemText}>{question.questionText}</Text>
                                {teamAnswers[question.id] && <Text style={styles.clueAnsweredIndicator}> (Answered by Teammate)</Text>}
                              </TouchableOpacity>
                            ))}
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
                {/* Players in Game display */}
                <Text style={styles.gameKeyText}>Players in Game:</Text>
                {playersInGame.length === 0 ? (
                  <Text style={styles.gameKeyText}>No players yet.</Text>
                ) : (
                  playersInGame.map((player, index) => (
                    <Text key={index} style={styles.gameKeyText}>- {player.name} ({player.id})</Text>
                  ))
                )}
              </>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  clueListContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 10,
  },
  categoryContainer: {
    marginBottom: 20,
    width: '100%',
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ececec',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  clueItem: {
    backgroundColor: '#6f9a7d',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  clueItemText: {
    color: '#ececec',
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  clueItemAnswered: {
    backgroundColor: '#5a8a6d', // Slightly darker green for answered clues
  },
  clueAnsweredIndicator: {
    color: '#c0c0c0',
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    marginTop: 5,
  },
  clueDetailContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    padding: 20,
  },
  clueDetailText: {
    fontSize: 20,
    color: '#ececec',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
  },
  clueImage: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  clueCaption: {
    fontSize: 14,
    color: '#ececec',
    fontStyle: 'italic',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
  },
  reviewAnswersContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 10,
  },
  teamAnswersContainer: {
    backgroundColor: '#2a6f91', // Slightly different background for team
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  teamNameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ececec',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  submittedAnswerItem: {
    backgroundColor: '#4a8f91', // Slightly different background for answer item
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  detailedAnswerContainer: {
    backgroundColor: '#2a6f91',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  teammateAnswerContainer: {
    backgroundColor: '#3a7f81', // Slightly different background for teammate answer
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  detailedAnswerInlineContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#555',
    width: '100%',
    alignItems: 'center',
  },
  reviewButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  reviewButtonCorrect: {
    backgroundColor: '#4CAF50', // Green
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  reviewButtonIncorrect: {
    backgroundColor: '#F44336', // Red
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  container: { // This style will now be used for specific components, not the main layout
    backgroundColor: '#155591',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#155591',
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
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
    marginBottom: 15,
    alignItems: 'center',
  },
  mainImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  gameKeyText: {
    fontSize: 18,
    marginVertical: 15,
    color: '#ececec',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    width: '80%',
    backgroundColor: '#fff',
    color: '#333',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#6f9a7d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
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
  homeScreenImage: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  congratulationsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  congratulationsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ececec',
    marginBottom: 20,
    textAlign: 'center',
  }
});