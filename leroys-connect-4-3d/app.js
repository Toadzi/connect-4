import board from './board.js';
import {
    Game
} from './game.js';


document.addEventListener('DOMContentLoaded', () => {
    board.init(); // Initialize the board

    const game = Game.getInstance(board);
    board.setGame(game); // Set the game instance in the board

    const depthElement = document.querySelector('#depth');
    const algorithmElement = document.querySelector('#algorithm');


    if (depthElement) {
        depthElement.addEventListener('change', (e) => {
            if (e && e.target) {
                game.setAIDepth(e.target.value);
                console.log(`Chosen Depth: ${e.target.value}`);
            }
        });
    }

    if (algorithmElement) {
        algorithmElement.addEventListener('change', (e) => {
            if (e && e.target) {
                game.setAIAlgorithm(e.target.value);
                console.log(`Chosen Algorithm: ${e.target.value}`);
            }
        });
    }

    window.addEventListener('resize', () => {
        board.onWindowResize();
    });



    board.animate(); // Start the animation loop
});
