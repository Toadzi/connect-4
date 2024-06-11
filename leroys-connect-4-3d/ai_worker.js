class AI {
    constructor(depth, algorithm) {
        this.depth = depth;
        this.algorithm = algorithm;
        console.log(`AI: depth ${depth}, algorithm: ${algorithm}`);
    }

    getMove(board) {
        const availableCols = this.getAvailableColumns(board);

        console.log("Board state:", board.grid);
        console.log("Available columns:", availableCols);

        if (availableCols.length === 0) {
            console.error("No available columns for AI to make a move.");
            return null;
        }

        let bestMove;
        if (this.algorithm === 'minimax') {
            bestMove = this.minimax(board, this.depth, true, -Infinity, Infinity);
        } else if (this.algorithm === 'negamax') {
            bestMove = this.negamax(board, this.depth, 1, -Infinity, Infinity);
        }

        console.log(`Chosen Move: Column ${bestMove.col}, Score: ${bestMove.score}`);
        return bestMove.col;
    }

    getAvailableColumns(board) {
        const availableCols = [];
        for (let c = 0; c < board.cols; c++) {
            if (!board.grid[board.rows - 1][c]) { // Check the bottom row instead
                availableCols.push(c);
            }
        }
        return availableCols;
    }

    minimax(board, depth, isMaximizingPlayer, alpha, beta) {
        const availableCols = this.getAvailableColumns(board);
        const player = isMaximizingPlayer ? 'blue' : 'red';

        if (depth === 0 || this.isWinningMove(board, 'blue') || this.isWinningMove(board, 'red')) {
            const score = this.evaluateBoard(board);
            console.log(`Terminal state reached at depth ${depth} with score ${score}`);
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
            const newBoard = this.simulateMove(board, col, player);
            const result = this.minimax(newBoard, depth - 1, !isMaximizingPlayer, alpha, beta);

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
                break;
            }
        }

        return bestMove;
    }

    negamax(board, depth, color, alpha, beta) {
        const availableCols = this.getAvailableColumns(board);

        if (depth === 0 || this.isWinningMove(board, 'blue') || this.isWinningMove(board, 'red')) {
            const score = color * this.evaluateBoard(board);
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
            const newBoard = this.simulateMove(board, col, color === 1 ? 'blue' : 'red');
            const result = this.negamax(newBoard, depth - 1, -color, -beta, -alpha);

            result.score = -result.score;

            if (result.score > bestMove.score) {
                bestMove = {
                    score: result.score,
                    col
                };
            }

            alpha = Math.max(alpha, result.score);

            if (alpha >= beta) {
                break;
            }
        }

        return bestMove;
    }

    evaluateBoard(board) {
        let score = 0;

        // Center column preference
        const centerArray = [];
        for (let r = 0; r < board.rows; r++) {
            centerArray.push(board.grid[r][Math.floor(board.cols / 2)]);
        }
        score += this.countOccurrences(centerArray, 'blue') * 3;

        // Horizontal, vertical, and diagonal checks
        score += this.evaluateLines(board, 'blue', 'red');
        score -= this.evaluateLines(board, 'red', 'blue');

        console.log('Board evaluation score:', score);
        return score;
    }

    evaluateLines(board, player, opponent) {
        let score = 0;

        // Horizontal
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols - 3; c++) {
                const window = board.grid[r].slice(c, c + 4);
                score += this.evaluateWindow(window, player, opponent);
            }
        }

        // Vertical
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

        // Diagonal \
        for (let r = 0; r < board.rows - 3; r++) {
            for (let c = 0; c < board.cols - 3; c++) {
                const window = [board.grid[r][c], board.grid[r + 1][c + 1], board.grid[r + 2][c + 2], board.grid[r + 3][c + 3]];
                score += this.evaluateWindow(window, player, opponent);
            }
        }

        // Diagonal /
        for (let r = 0; r < board.rows - 3; r++) {
            for (let c = 0; c < board.cols - 3; c++) {
                const window = [board.grid[r][c + 3], board.grid[r + 1][c + 2], board.grid[r + 2][c + 1], board.grid[r + 3][c]];
                score += this.evaluateWindow(window, player, opponent);
            }
        }

        return score;
    }

    countOccurrences(array, value) {
        return array.reduce((count, elem) => elem === value ? count + 1 : count, 0);
    }

    evaluateWindow(window, aiPlayer, opponent) {
        let score = 0;
        const aiCount = window.filter(cell => cell === aiPlayer).length;
        const opponentCount = window.filter(cell => cell === opponent).length;
        const emptyCount = window.filter(cell => cell === null).length;

        if (aiCount === 4) {
            score += 1000;  // Increase score for winning move
        } else if (aiCount === 3 && emptyCount === 1) {
            score += 100;
        } else if (aiCount === 2 && emptyCount === 2) {
            score += 10;
        }

        if (opponentCount === 3 && emptyCount === 1) {
            score -= 500;  // Increase penalty to discourage ignoring threats
        } else if (opponentCount === 2 && emptyCount === 2) {
            score -= 50;  // Additional penalty for two in a row
        }

        return score;
    }

    simulateMove(board, col, player) {
        const newBoard = JSON.parse(JSON.stringify(board));
        for (let r = 0; r < board.rows; r++) { // Start from the bottom row
            if (!newBoard.grid[r][col]) {
                newBoard.grid[r][col] = player;
                break;
            }
        }
        return newBoard;
    }

    isWinningMove(board, player) {
        const winPatterns = [
            [[0, 1], [0, 2], [0, 3]],  // Horizontal right
            [[1, 0], [2, 0], [3, 0]],  // Vertical down
            [[1, 1], [2, 2], [3, 3]],  // Diagonal down-right
            [[1, -1], [2, -2], [3, -3]] // Diagonal down-left
        ];

        const checkWin = (grid, row, col, player) => {
            return winPatterns.some(pattern =>
                pattern.every(([dr, dc]) =>
                    grid[row + dr] && grid[row + dr][col + dc] === player
                )
            );
        };

        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.grid[r][c] === player && checkWin(board.grid, r, c, player)) {
                    return true;
                }
            }
        }
        return false;
    }
}

let ai = null;

self.onmessage = (e) => {
    const { board, depth, algorithm } = e.data;

    // Initialize AI if not already done
    if (!ai || ai.depth !== depth || ai.algorithm !== algorithm) {
        ai = new AI(depth, algorithm);
    }

    const bestMove = ai.getMove(board);
    if (bestMove === null) {
        self.postMessage(null);
    } else {
        self.postMessage(bestMove);
    }
};
