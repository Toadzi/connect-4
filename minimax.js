// Proper initialization
if (typeof importScripts === 'function') {
    importScripts('config.js');
    importScripts('board.js');

    this.addEventListener('message', function (ev) {
        const params = JSON.parse(ev.data);
        const board = new CanvasBoard(params.matrixBoard);
        const minimax = new Minimax(board, params.depth, params.maximizingPlayer);
        const newMove = minimax.alphabeta();
        this.postMessage(newMove);
    }, false);
}

class Minimax {
    constructor(board, depth, maximizingPlayer) {
        this.board = board;
        this.depth = depth;
        this.maximizingPlayer = maximizingPlayer;
        console.log("class Minimax :: board: ", board ," : depth: ", depth);
    }

    static max(a, b) {
        return a.score > b.score ? { ...a } : { ...b };
    }

    static min(a, b) {
        return a.score < b.score ? { ...a } : { ...b };
    }

    alphabeta() {
        return this._alphabeta(this.board, this.depth, { score: -Infinity }, { score: Infinity }, this.maximizingPlayer);
    }

    _alphabeta(board, depth, alpha, beta, maximizingPlayer) {
        const currentScore = board.getScore();
        const player = maximizingPlayer ? Config.HUMAN_PLAYER : Config.COMPUTER_AI;
        const nodes = [];

        // Check all possible moves
        for (let column = 0; column < Config.COLUMNS_SIZE; column++) {
            const nextPossibleBoard = board.placeMove(player, column, true);
            if (nextPossibleBoard) nodes.push({ column, board: nextPossibleBoard });
        }

        const isDraw = nodes.length === 0;

        if (depth === 0 || isDraw || Math.abs(currentScore) >= Config.WINNING_SCORE) {
            return { columnMove: null, score: currentScore };
        }

        if (maximizingPlayer) {
            return this._maximize(nodes, depth, alpha, beta);
        } else {
            return this._minimize(nodes, depth, alpha, beta);
        }
    }

    _maximize(nodes, depth, alpha, beta) {
        let bestMove = { columnMove: null, score: -Infinity };

        for (const { column, board } of nodes) {
            const nextMove = this._alphabeta(board, depth - 1, alpha, beta, false);
            if (nextMove.score > bestMove.score || bestMove.columnMove === null) {
                bestMove = { columnMove: column, score: nextMove.score };
            }
            alpha = Minimax.max(alpha, nextMove);
            if (beta.score <= alpha.score) break; // Beta cut-off
        }

        return bestMove;
    }

    _minimize(nodes, depth, alpha, beta) {
        let bestMove = { columnMove: null, score: Infinity };

        for (const { column, board } of nodes) {
            const nextMove = this._alphabeta(board, depth - 1, alpha, beta, true);
            if (nextMove.score < bestMove.score || bestMove.columnMove === null) {
                bestMove = { columnMove: column, score: nextMove.score };
            }
            beta = Minimax.min(beta, nextMove);
            if (beta.score <= alpha.score) break; // Alpha cut-off
        }

        return bestMove;
    }
}
