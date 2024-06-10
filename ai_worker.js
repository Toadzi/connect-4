export default class AI {
	constructor(depth, algorithm, gameInstance) {
		// Initialisiert die KI mit einer bestimmten Suchtiefe und einem Algorithmus.
		this.depth = depth;
		this.algorithm = algorithm;
		this.game = gameInstance;  // Speichern der Referenz auf die Game-Instanz
		console.log(`Auswahl: Depth: ${this.depth}`);
		console.log(`Auswahl: Algorithm: ${this.algorithm}`);
	}

	getMove(board){
		// Ermittelt den besten Zug für die KI basierend auf dem aktuellen Zustand des Spielfelds.
		const availableCols = [];
		// Erstelle eine Liste der verfügbaren Spalten (d.h. Spalten, die nicht voll sind).
		for (let c = 0; c < board.cols; c++) {
			if (!board.grid[0][c]) {
				availableCols.push(c);
			}
		}

		let bestMove;
		// Wählt den Algorithmus basierend auf der Konfiguration.
		if (this.algorithm === 'minimax') {
			// Führt den Minimax-Algorithmus aus, um den besten Zug zu finden.
			bestMove = this.minimax(board, this.depth, true, -Infinity, Infinity);
			this.game.appendToConsole(`Minimax: Best move is column ${bestMove.col} with score ${bestMove.score}`);
			//console.log(`Minimax: Best move is column ${bestMove.col} with score ${bestMove.score}`);
		} else if (this.algorithm === 'negamax') {
			// Führt den Negamax-Algorithmus aus, um den besten Zug zu finden.
			bestMove = this.negamax(board, this.depth, 1, -Infinity, Infinity);
			//console.log(`Negamax: Best move is column ${bestMove.col} with score ${bestMove.score}`);
			this.game.appendToConsole(`Negamax: Best move is column ${bestMove.col} with score ${bestMove.score}`);
		}

		//console.log(`Chosen Move: Column ${bestMove.col}, Score: ${bestMove.score}`);
		return bestMove.col;
	}

	minimax(board, depth, isMaximizingPlayer, alpha, beta) {
		// Implementiert den Minimax-Algorithmus mit Alpha-Beta-Pruning zur Optimierung.
		const availableCols = [];
		for (let c = 0; c < board.cols; c++) {
			if (!board.grid[0][c]) {
				availableCols.push(c);
			}
		}
		if (depth === 0 || board.winning) {
			// Bewertet das Brett, wenn die maximale Tiefe erreicht ist oder das Spiel vorbei ist.
			const score = this.evaluateBoard(board);
			//console.log(`Reached leaf node at depth ${depth}, score: ${score}`);
			//this.game.appendToConsole(`Reached leaf node at depth ${depth}, score: ${score}`);
			return {
				score: score,
				col: null
			};
		}

		let bestMove = {
			score: isMaximizingPlayer ? -Infinity : Infinity,
			col: availableCols[0]
		};

		for (let col of availableCols) {
			// Simuliert den Zug auf dem Brett und ruft rekursiv minimax auf.
			const newBoard = this.simulateMove(board, col, isMaximizingPlayer ? 'ai' : 'player');
			const result = this.minimax(newBoard, depth - 1, !isMaximizingPlayer, alpha, beta);

			// Aktualisiert den besten Zug, basierend darauf, ob der Spieler maximiert oder minimiert.
			if (isMaximizingPlayer) {
				if (result.score > bestMove.score) {
					bestMove = {
						score: result.score,
						col
					};
				}
				alpha = Math.max(alpha, result.score);
			} else {
				if (result.score < bestMove.score) {
					bestMove = {
						score: result.score,
						col
					};
				}
				beta = Math.min(beta, result.score);
			}

			if (beta <= alpha) {
				//console.log(`Pruning branches at depth ${depth} with alpha ${alpha} and beta ${beta}`);
				this.game.appendToConsole(`Pruning branches at depth ${depth} with alpha ${alpha} and beta ${beta}`);
				break;
			}
		}

		return bestMove;
	}

	negamax(board, depth, color, alpha, beta) {
		// Implementiert den Negamax-Algorithmus, eine Variante von Minimax, bei der nur ein Score verwendet wird.
		const availableCols = [];
		for (let c = 0; c < board.cols; c++) {
			// Simuliert den Zug und ruft negamax rekursiv auf.
			if (!board.grid[0][c]) {
				availableCols.push(c);
			}
		}

		if (depth === 0 || board.winning) {
			const score = color * this.evaluateBoard(board);
			//console.log(`Reached leaf node at depth ${depth}, score: ${score}`);
			this.game.appendToConsole(`Reached leaf node at depth ${depth}, score: ${score}`);
			return {
				score: score,
				col: null
			};
		}

		let bestMove = {
			score: -Infinity,
			col: availableCols[0]
		};

		for (let col of availableCols) {
			const newBoard = this.simulateMove(board, col, color === 1 ? 'ai' : 'player');
			const result = this.negamax(newBoard, depth - 1, -color, -beta, -alpha);
			//console.log(`Depth ${depth}, Col ${col}, Score ${result.score}`);
			this.game.appendToConsole(`Depth ${depth}, Col ${col}, Score ${result.score}`);
			result.score = -result.score;

			if (result.score > bestMove.score) {
				bestMove = {
					score: result.score,
					col
				};
			}

			alpha = Math.max(alpha, result.score);

			console.log(`Column: ${col}, Score: ${result.score}`);

			if (alpha >= beta) {
				//console.log(`Pruning branches at depth ${depth} with alpha ${alpha} and beta ${beta}`);
				this.game.appendToConsole(`Pruning branches at depth ${depth} with alpha ${alpha} and beta ${beta}`);
				break;
			}
		}

		return bestMove;
	}

	evaluateBoard(board) {
		// Bewertet das Spielfeld aus der Sicht der KI.
		let score = 0;

		// Zentrale Spaltenpräferenz, weil sie statistisch vorteilhaft ist.
		const centerArray = [];
		for (let r = 0; r < board.rows; r++) {
			centerArray.push(board.grid[r][Math.floor(board.cols / 2)]);
		}
		score += this.countOccurrences(centerArray, 'ai') * 3;

		// Bewertet horizontale, vertikale und diagonale Linien.
		score += this.evaluateLines(board, 'ai', 'player');
		score -= this.evaluateLines(board, 'player', 'ai');

		//console.log(`Evaluating board at depth: Current score: ${score}`);
		//this.game.appendToConsole(`Evaluating board at depth: Current score: ${score}`);
		return score;
	}

	evaluateLines(board, player, opponent) {
		// Bewertet alle Linien auf dem Brett, um potenzielle Gewinnmöglichkeiten oder Bedrohungen zu erkennen.
		let score = 0;

		// Horizontale Linien durchgehen.
		for (let r = 0; r < board.rows; r++) {
			for (let c = 0; c < board.cols - 3; c++) {
				const window = board.grid[r].slice(c, c + 4);
				score += this.evaluateWindow(window, player, opponent);
			}
		}

		// Vertikale Linien durchgehen.
		for (let c = 0; c < board.cols; c++) {
			const colArray = [];
			for (let r = 0; r < board.rows; r++) {
				colArray.push(board.grid[r][c]);
			}
			for (let r = 0; r < board.rows - 3; r++) {
				const window = colArray.slice(r, r + 4);
				score += this.evaluateWindow(window, player, opponent);
			}
		}

		// Diagonale Linien von links oben nach rechts unten.
		for (let r = 0; r < board.rows - 3; r++) {
			for (let c = 0; c < board.cols - 3; c++) {
				const window = [board.grid[r][c], board.grid[r + 1][c + 1], board.grid[r + 2][c + 2], board.grid[r + 3][c + 3]];
				score += this.evaluateWindow(window, player, opponent);
			}
		}

		// Diagonale Linien von rechts oben nach links unten.
		for (let r = 0; r < board.rows - 3; r++) {
			for (let c = 0; c < board.cols - 3; c++) {
				const window = [board.grid[r][c + 3], board.grid[r + 1][c + 2], board.grid[r + 2][c + 1], board.grid[r + 3][c]];
				score += this.evaluateWindow(window, player, opponent);
			}
		}

		return score;
	}

	countOccurrences(array, value) {
		// Zählt die Vorkommen eines bestimmten Wertes in einem Array
		return array.reduce((count, elem) => elem === value ? count + 1 : count, 0);
	}

	evaluateWindow(window, aiPlayer, opponent) {
		// Bewertet ein spezifisches 4-Zellen-Fenster auf dem Brett.
		let score = 0;
		const aiCount = window.filter(cell => cell === aiPlayer).length;
		const opponentCount = window.filter(cell => cell === opponent).length;
		const emptyCount = window.filter(cell => cell === null).length;

		// Gewichtung der Zellen nach ihrer Bedeutung.
		if (aiCount === 4) {
			score += 100;
		} else if (aiCount === 3 && emptyCount === 1) {
			score += 10;  // Fast gewinnend
		} else if (aiCount === 2 && emptyCount === 2) {
			score += 5; // Mögliche Bedrohung
		}

		if (opponentCount === 3 && emptyCount === 1) {
			score -= 8;  // Blockieren eines fast gewinnenden Zugs des Gegners
		}

		return score;
	}

	simulateMove(board, col, player) {
		// Simuliert einen Zug auf dem Brett, ohne das Originalbrett zu verändern.
		const newBoard = JSON.parse(JSON.stringify(board));
		for (let r = board.rows - 1; r >= 0; r--) {
			if (!newBoard.grid[r][col]) {
				newBoard.grid[r][col] = player;
				break;
			}
		}
		return newBoard;
	}
}
