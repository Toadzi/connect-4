class Negamax {
    constructor(board) {
        this.board = board;
    }

    negamax(alpha, beta, depth, color) {
        if (depth === 0 || this.board.isGameOver()) {
            return color * this.board.getScore();
        }
        let max = -Infinity;
        let columns = [0, 1, 2, 3, 4, 5, 6];
        // Shuffle columns to evaluate in random order
        for (let i = columns.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [columns[i], columns[j]] = [columns[j], columns[i]];
        }
        for (let i = 0; i < columns.length; i++) {
            let nextBoard = new CanvasBoard(this.board.matrixBoard, this.board.currentgame);
            if (nextBoard.placeMove(color === 1 ? Config.HUMAN_PLAYER : Config.COMPUTER_AI, columns[i], true)) {
                let score = -this.negamax(-beta, -alpha, depth - 1, -color);
                if (score > max) {
                    max = score;
                }
                if (max > alpha) {
                    alpha = max;
                }
                if (alpha >= beta) {
                    break;
                }
            }
        }
        return max;
    }
}

export default Negamax;
