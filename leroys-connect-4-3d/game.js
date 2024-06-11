import { Board } from './board.js';

export class Game {
    constructor(board) {
        this.turn = 'red';
        this.game = { playing: true, winner: "" };
        this.board = board;

        this.aiDepth = 4;  // Set default AI depth
        this.aiAlgorithm = 'minimax';  // Set default AI algorithm
        this.worker = new Worker(new URL('./ai_worker.js', import.meta.url));

        this.worker.onmessage = (e) => {
            const col = e.data;
            if (col !== null) {
                console.log(`AI selected column: ${col}`);
                this.makeMove(col);
            } else {
                console.error('AI returned a null column.');
                this.endGame();
            }
        };

        // Initialize the internal grid representation
        this.board.grid = Array.from({ length: 6 }, () => Array(7).fill(null));
    }

    static getInstance(board) {
        if (!Game.instance) {
            Game.instance = new Game(board);
        }
        return Game.instance;
    }

    createFicha(col) {
        console.log('Creating ficha in column:', col);
        const x = -44.7 + col * 13.8;
        let posY;
        let placed = false;
        let row;
        for (let i = 0; i < 6; i++) {
            if (!this.findFicha(x, -50 + i * 10)) {
                posY = -50 + i * 10;
                placed = true;
                row = i;
                break;
            }
        }
        if (!placed) {
            console.log('Column is full');
            return;  // If no position is found, the column is full
        }
        const geometry = new THREE.BoxGeometry(10, 10, 1);
        const material = this.turn === 'red' ? this.board.materials.red_ficha : this.board.materials['blue-ficha'];
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(x, posY, 1);
        this.board.fichasGroup.add(mesh);

        // Update internal grid state
        this.board.grid[row][col] = this.turn;

        // Check for a winner after placing a ficha
        this.checkWinner();

        if (this.game.playing) {
            // Switch turn
            this.turn = this.turn === 'red' ? 'blue' : 'red';
            document.getElementById('turn').innerText = this.turn;

            // If it's AI's turn, request the AI move
            if (this.turn === 'blue') {
                this.requestAIMove();
            }
        }
    }

    findFicha(x, y, tolerance = 0.1) {
        return this.board.fichasGroup.children.find(ficha =>
            Math.abs(ficha.position.x - x) < tolerance &&
            Math.abs(ficha.position.y - y) < tolerance
        );
    }

    checkLine(a, b, c, d) {
        return ((a.material.color.getHex() !== 0xffffff) && (a.material.color.getHex() === b.material.color.getHex()) && (a.material.color.getHex() === c.material.color.getHex()) && (a.material.color.getHex() === d.material.color.getHex()));
    }

    checkWinner() {
        let winner = "";
        const grid = this.board.grid;
        const auxArray = grid.map((row, i) =>
            row.map((cell, j) =>
                this.findFicha(-44.7 + j * 13.8, -50 + i * 10) || { material: { color: new THREE.Color(0xffffff) } }
            )
        );

        for (let row = 0; row <= 2; row++) {
            for (let col = 0; col < 7; col++) {
                if (this.checkLine(auxArray[row][col], auxArray[row + 1][col], auxArray[row + 2][col], auxArray[row + 3][col])) {
                    winner = auxArray[row][col].material.color.getHex() === this.board.materials.red_ficha.color.getHex() ? "red" : "blue";
                    console.log(`Vertical winner at row: ${row}, col: ${col}`);
                    this.game.playing = false;
                }
            }
        }
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col <= 3; col++) {
                if (this.checkLine(auxArray[row][col], auxArray[row][col + 1], auxArray[row][col + 2], auxArray[row][col + 3])) {
                    winner = auxArray[row][col].material.color.getHex() === this.board.materials.red_ficha.color.getHex() ? "red" : "blue";
                    console.log(`Horizontal winner at row: ${row}, col: ${col}`);
                    this.game.playing = false;
                }
            }
        }
        for (let row = 0; row <= 2; row++) {
            for (let col = 0; col <= 3; col++) {
                if (this.checkLine(auxArray[row][col], auxArray[row + 1][col + 1], auxArray[row + 2][col + 2], auxArray[row + 3][col + 3])) {
                    winner = auxArray[row][col].material.color.getHex() === this.board.materials.red_ficha.color.getHex() ? "red" : "blue";
                    console.log(`Diagonal down-right winner at row: ${row}, col: ${col}`);
                    this.game.playing = false;
                }
            }
        }
        for (let row = 3; row < 6; row++) {
            for (let col = 0; col <= 3; col++) {
                if (this.checkLine(auxArray[row][col], auxArray[row - 1][col + 1], auxArray[row - 2][col + 2], auxArray[row - 3][col + 3])) {
                    winner = auxArray[row][col].material.color.getHex() === this.board.materials.red_ficha.color.getHex() ? "red" : "blue";
                    console.log(`Diagonal up-right winner at row: ${row}, col: ${col}`);
                    this.game.playing = false;
                }
            }
        }
        if (winner !== "") {
            this.game.playing = false;
            this.game.winner = winner;
            console.log(`Winner is: ${winner}`);
            document.querySelector('.game-over').style.display = 'block';
            document.getElementById('winner').innerText = `${winner} Wins`;
        }
    }

    setAIDepth(depth) {
        this.aiDepth = depth;
    }

    setAIAlgorithm(algorithm) {
        this.aiAlgorithm = algorithm;
    }

    requestAIMove() {
        console.log('Requesting AI move...');

        // Extract only the serializable data from the board
        const boardData = {
            grid: this.board.grid,
            rows: this.board.grid.length,
            cols: this.board.grid[0].length
        };

        console.log('Sending board data to AI:', boardData);

        this.worker.postMessage({
            board: boardData,
            depth: this.aiDepth,
            algorithm: this.aiAlgorithm,
        });
    }

    makeMove(col) {
        if (this.isGameOver) return;
        console.log(`Making move for player ${this.turn} in column ${col}`);
        this.createFicha(col);
    }

    endGame() {
        console.log('Game over, no moves left.');
        this.game.playing = false;
        document.querySelector('.game-over').style.display = 'block';
        document.getElementById('winner').innerText = 'Draw';
    }

    showThinkingStatus() {
        document.getElementById('ai-status').innerText = '... is thinking';
    }

    hideThinkingStatus() {
        document.getElementById('ai-status').innerText = '';
    }
}

export default Game;
