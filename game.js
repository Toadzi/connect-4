import config from './config.js';
import Board from './board.js';
import AI from './ai_worker.js';

$(document).ready(function() {
    class Game {
        constructor() {
            this.canvas = document.getElementById('boardGame');
            this.ctx = this.canvas.getContext('2d');
            this.restartBtn = document.getElementById('restartGame');
            this.depthSelect = document.getElementById('depthSelect');
            this.algorithmSelect = document.getElementById('algorithmSelect');

            this.historyTable = document.getElementById('historyTable');
            this.gestureIndicator = document.getElementById('gestureIndicator');
            this.toggleGestureControlBtn = document.getElementById('toggleGestureControl');

            this.historyOpen = $('#historyOpenBtn');
            this.instructionsyOpen = $('#instructionsOpenBtn');
            this.historyGame = $('#historyGame');

            this.lastClickTime = 0; // Speichert den Zeitpunkt des letzten erkannten Klicks
            this.gestureStartTime = 0;
            this.isGestureActive = false;

            this.board = null;
            this.ai = null;
            this.history = [];
            this.moveNumber = 0;
            this.isGestureControlEnabled = true; // Standardmäßig ist die Gestensteuerung deaktiviert

            this.initCameraAndHands();
            this.initGame();
            this.addEventListeners();
            this.fingerMarker = {
                x: 0,
                y: 0,
                radius: 10
            }; // Startposition und Größe des Markers
        }

        initGame() {
            console.log("Initializing game...");
            this.board = new Board(config.rows, config.cols, config.connect);
            this.ai = new AI(config.depth, config.algorithm, this);
            this.history = [];
            this.moveNumber = 0;

            this.lastClickTime = 0; // Speichert den Zeitpunkt des letzten erkannten Klicks
            this.gestureStartTime = 0;
            this.isGestureActive = false;

            this.updateUI();
            this.updateHistoryTable();
            this.startNewGame();
        }

        initCameraAndHands() {
            this.webcamContainer = document.getElementById('webcam'); // Hole das Container-Element
            if (!this.webcamContainer) {
                console.error('Webcam container not found!');
                return;
            }

            this.videoElement = document.createElement('video');
            this.videoElement.setAttribute('playsinline', ''); // Wichtig für iOS-Webbrowsers
            this.webcamContainer.appendChild(this.videoElement); // Füge das Videoelement zum Container hinzu

            const hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults(this.onHandResults.bind(this));

            this.hands = hands; // Speichere die MediaPipe Hands-Instanz

            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    await this.hands.send({
                        image: this.videoElement
                    });
                },
                width: 1280,
                height: 720
            });

            this.startCamera();
        }

        onHandResults(results) {
            this.lastHandResults = results; // Speichere die letzten Ergebnisse für die Klick-Gesten-Erkennung
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                const fingerTip = landmarks[8];
                const x = fingerTip.x * window.innerWidth;
                const y = fingerTip.y * window.innerHeight;
                this.updateMarkerPosition(x, y);
            }
        }

        isClickGestureDetected() {
            const now = Date.now();
            if (now - this.lastClickTime < config.clickLockoutPeriod) {
                return false;
            }

            if (!this.lastHandResults || this.lastHandResults.multiHandLandmarks.length === 0) {
                return false;
            }

            const landmarks = this.lastHandResults.multiHandLandmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const dx = thumbTip.x - indexTip.x;
            const dy = thumbTip.y - indexTip.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const clickThreshold = config.clickThreshold;

            if (distance < clickThreshold) {
                if (!this.isGestureActive) {
                    this.isGestureActive = true;
                    this.gestureStartTime = Date.now();
                }
                const elapsed = Date.now() - this.gestureStartTime;
                if (elapsed > config.clickDurationRequired) {
                    this.isGestureActive = false;
                    this.lastClickTime = now;
                    return true;
                }
            } else {
                this.isGestureActive = false;
            }
            return false;
        }

        updateMarkerPosition(newX, newY) {
            // Umkehrung der X-Koordinate
            const correctedX = this.canvas.width - newX;

            // Stellt sicher, dass der Marker innerhalb der Grenzen bleibt
            this.fingerMarker.x = Math.min(Math.max(correctedX, 0), this.canvas.width);
            this.fingerMarker.y = Math.min(Math.max(newY, 0), this.canvas.height);
            this.drawFingerMarker();

            const col = Math.floor(this.fingerMarker.x / (this.canvas.width / config.cols));

            if (this.board.winning || this.board.full) {
                console.log("Game over or board full. Move ignored.");
                this.showPlayError(`Kein Zug mehr möglich: ${this.board.winning ? "Spiel ist vorbei." : "Das Spielfeld ist voll."}`);
                return;
            }

            const gestureDetected = this.isClickGestureDetected();
            console.log('Gesture Detected: ', gestureDetected);
            if (gestureDetected) {
                this.onPlayerMove(col);
                this.showLockoutIndicator();
            }
        }

        drawFingerMarker() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'red';
            this.ctx.beginPath();
            this.ctx.arc(this.fingerMarker.x, this.fingerMarker.y, this.fingerMarker.radius, 0, 2 * Math.PI);
            this.ctx.fill();

            this.board.draw(this.ctx);
        }

        showPlayError(message) {
            const errorDiv = document.getElementById('playError');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        hidePlayError() {
            const errorDiv = document.getElementById('playError');
            errorDiv.style.display = 'none';
        }
		showMessage(message, colorClass) {
            const messageDiv = document.getElementById('showMessage');
            messageDiv.textContent = message;
            messageDiv.style.display = 'block';
        }

        hideMessage() {
            const messageDiv = document.getElementById('showMessage');
            messageDiv.style.display = 'none';
        }

        showLockoutIndicator() {
            const lockoutIndicator = document.getElementById('lockoutIndicator');
            lockoutIndicator.style.display = 'block';
            setTimeout(() => {
                lockoutIndicator.style.display = 'none';
            }, config.clickLockoutPeriod);
        }

        startNewGame() {
            this.updateUI();
            this.updateHistoryTable();
            /*fetch('php/start_game.php', {
                    method: 'POST',
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        this.gameId = data.game_id;
                        console.log(`Started new game with ID: ${this.gameId}`);
                        this.updateUI();
                        this.updateHistoryTable();
                    } else {
                        console.error('Error starting new game:', data.message);
                    }
                });*/
        }

        updateUI() {
            console.log("Updating UI...");
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            //console.log("Board draw: ", this.ctx);
            this.board.draw(this.ctx);
            //this.scoreSpan.textContent = this.board.score;
            //this.winningAlert.style.display = this.board.winning ? 'block' : 'none';
            //if (this.board.winning) this.winningAlert.textContent = `${this.board.winning} wins!`;
            //this.waitingAlert.style.display = 'none';
			this.hideMessage(); // Setze Meldung "AI thinking ..." zurück

			if (this.board.winning) {
				this.showMessage(`Player: ${this.board.winning} wins!`);
			}
			console.log("UI updated. Board state:", this.board.grid);


        }



        onPlayerMove(col) {
            console.log(`Player moves to column ${col}`);
            this.hidePlayError();
            if (this.board.winning || this.board.full) {
                console.log("Game over or board full. Move ignored.");
                return;
            }

            const row = this.board.placeToken(col, 'player');
            this.history.push({
                player: 'Player',
                col,
                row,
                moveNumber: this.moveNumber++
            });
            this.storeMove('Player', col, row);
            this.updateUI();
            this.updateHistoryTable();

            if (!this.board.winning && !this.board.full) {
                this.showMessage(`AI is thinking ...`);
                setTimeout(() => {
                    this.aiMove();
                }, config.aiDelay);
            }
        }

        aiMove() {
            console.log("AI is thinking...");
            const col = this.ai.getMove(this.board);
            console.log(`AI moves to column ${col}`);
            const row = this.board.placeToken(col, 'ai');
            this.history.push({
                player: 'AI',
                col,
                row,
                moveNumber: this.moveNumber++
            });
            this.storeMove('AI', col, row);
            this.updateUI();
            this.updateHistoryTable();

            if (this.board.winning || this.board.full) {
                console.log("Game over after AI move.");
                console.log("isGestureControlEnabled", this.isGestureControlEnabled);
                if (this.isGestureControlEnabled) {
                    this.disableGestureControl();
                    this.isGestureControlEnabled = false;
                    this.toggleGestureControlBtn.textContent = 'Gestensteuerung aktivieren';
                } else {
                    this.enableGestureControl();
                    this.toggleGestureControlBtn.textContent = 'Gestensteuerung deaktivieren';

                }
                //this.toggleGestureControl();
                return;
            }
        }


        addEventListeners() {
            this.canvas.addEventListener('click', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const col = Math.floor(x / (this.canvas.width / config.cols));
                this.onPlayerMove(col);
            });

            this.toggleGestureControlBtn.addEventListener('click', () => {
                console.log("Gesternsteuerung ein/aus...");
                this.toggleGestureControl()
            });

            this.restartBtn.addEventListener('click', () => {
                console.log("Restarting game...");
                this.initGame();
            });

            this.depthSelect.addEventListener('change', (e) => {
                config.depth = parseInt(e.target.value, 10);
                this.ai.depth = config.depth;
                console.log(`Depth changed to ${config.depth}`);
            });

            this.algorithmSelect.addEventListener('change', (e) => {
                config.algorithm = e.target.value;
                this.ai.algorithm = config.algorithm;
                console.log(`Algorithm changed to ${config.algorithm}`);
            });
            this.historyOpen.on('click', () => {
                console.log("Öffne Historie");
                $('#modalHistory').modal('show');
            });

            this.instructionsyOpen.on('click', () => {
                console.log("Öffne Instrucions");
                $('#modalInstructions').modal('show');
            });
        }

        updateHistoryTable() {
            this.historyTable.innerHTML = `
			<thead>
				<tr>
					<th>Player</th>
					<th>Column</th>
					<th>Row</th>
					<th>Move Number</th>
				</tr>
			</thead>
			`;
            const tableBody = document.createElement('tbody');
            this.history.forEach((move) => {
                const row = document.createElement('tr');
                row.innerHTML = `
				<td>${move.player}</td>
				<td>${move.col}</td>
				<td>${move.row + 1}</td>
				<td>${move.moveNumber + 1}</td>
			`;
                tableBody.appendChild(row);
            });
            this.historyTable.appendChild(tableBody);
        }

        storeMove(player, col, row) {
            // Erstelle ein Objekt für den Spielzug
            const move = {
                gameId: this.gameId,
                player: player,
                col: col,
                row: row,
                moveNumber: this.moveNumber
            };

            // Hole bestehende Züge aus dem localStorage oder initialisiere ein leeres Array
            let moves = JSON.parse(localStorage.getItem('gameMoves')) || [];

            // Füge den neuen Zug hinzu
            moves.push(move);

            // Speichere die aktualisierte Zugliste im localStorage
            localStorage.setItem('gameMoves', JSON.stringify(moves));

            console.log(`Move stored: ${player} moved to column ${col} at row ${row}`);
        }

        storeMoveDB(player, col, row) {
            fetch('php/store_move.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        game_id: this.gameId,
                        player: player,
                        col: col,
                        row: row,
                        moveNumber: this.moveNumber,
                    }),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status !== 'success') {
                        console.error('Error storing move:', data.message);
                        alert("Fehler beim Speichern des Zuges: " + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error during fetch operation:', error);
                    alert("Ein Fehler ist aufgetreten: " + error.message);
                });
        }

        toggleGestureControl() {
            this.isGestureControlEnabled = !this.isGestureControlEnabled;
            if (this.isGestureControlEnabled) {
                this.enableGestureControl();
                this.toggleGestureControlBtn.textContent = 'Gestensteuerung deaktivieren';
            } else {
                this.disableGestureControl();
                this.toggleGestureControlBtn.textContent = 'Gestensteuerung aktivieren';
            }
        }

        disableGestureControl() {
            if (this.camera && this.camera.video.srcObject) {
                const tracks = this.camera.video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                this.camera.video.srcObject = null;
            }
            console.log("Kamera und Gestensteuerung deaktiviert.");
        }

        enableGestureControl() {
            // Stelle sicher, dass die Kamera- und Handmodell-Instanzen existieren
            if (!this.camera) {
                this.initCameraAndHands();
            } else {
                // Starte die Kamera erneut, falls sie bereits initialisiert wurde, aber gestoppt war
                this.startCamera();
            }
            console.log("Gestensteuerung aktiviert.");
        }

        startCamera() {
            if (this.camera) {
                this.camera.start();
            }
        }

        appendToConsole(message) {
            const consoleDiv = document.getElementById('consoleOutput');
            if (!consoleDiv) {
                console.error("Console div not found");
                return;
            }
            //const timeNow = new Date().toLocaleTimeString();
            consoleDiv.innerHTML += `${message}<br>`;
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        }

    }

    // Initialize the game
    new Game();
});
