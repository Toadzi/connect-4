import config from './config.js';

export default class Board {
    constructor(rows, cols, connect) {
        this.rows = rows;
        this.cols = cols;
        this.connect = connect;
        this.grid = Array.from({ length: rows }, () => Array(cols).fill(null));
        this.winning = null;
        this.full = false;
    }

    draw(ctx) {
        const cellWidth = ctx.canvas.width / this.cols;
        const cellHeight = ctx.canvas.height / this.rows;
        ctx.strokeStyle = '#282c34';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                ctx.strokeRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
                if (this.grid[r][c]) {
                    ctx.fillStyle = this.grid[r][c] === 'player' ? config.colorplayer : config.colorai;
                    ctx.beginPath();
                    ctx.arc(
                        c * cellWidth + cellWidth / 2,
                        r * cellHeight + cellHeight / 2,
                        Math.min(cellWidth, cellHeight) / 2 - 5,
                        0,
                        2 * Math.PI
                    );
                    ctx.fill();
                }
            }
        }
    }

    placeToken(col, player) {
        for (let r = this.rows - 1; r >= 0; r--) {
            if (!this.grid[r][col]) {
                this.grid[r][col] = player;
                if (this.checkWin(r, col, player)) {
                    this.winning = player;
                }
                this.full = this.checkFull();
                return r;
            }
        }
    }

    checkWin(row, col, player) {
        const directions = [
            { dr: 0, dc: 1 },
            { dr: 1, dc: 0 },
            { dr: 1, dc: 1 },
            { dr: 1, dc: -1 }
        ];

        for (let { dr, dc } of directions) {
            let count = 1;

            for (let i = 1; i < this.connect; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c] === player) {
                    count++;
                } else {
                    break;
                }
            }

            for (let i = 1; i < this.connect; i++) {
                const r = row - dr * i;
                const c = col - dc * i;
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c] === player) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= this.connect) {
                return true;
            }
        }

        return false;
    }

    checkFull() {
        return this.grid[0].every(cell => cell !== null);
    }
}
