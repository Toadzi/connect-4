class QLearningAgent {
    constructor(alpha = 0.1, gamma = 0.9, epsilon = 0.1) {
        this.qTable = {}; // This will store our Q-values
        this.alpha = alpha; // Learning rate
        this.gamma = gamma; // Discount factor
        this.epsilon = epsilon; // Exploration rate
    }

    getState(board) {
        return board.flat().join(',');
    }

    chooseAction(state, availableActions) {
        if (!(state in this.qTable)) {
            this.qTable[state] = Array(availableActions.length).fill(0);
        }

        if (Math.random() < this.epsilon) {
            return availableActions[Math.floor(Math.random() * availableActions.length)];
        }

        let qValues = this.qTable[state];
        let maxQValue = Math.max(...qValues);
        return availableActions[qValues.indexOf(maxQValue)];
    }

    updateQValue(state, action, reward, nextState, availableActions) {
		console.log(`updateQValue: ${state} reward: ${reward} nextState: ${reward} availableActions: ${availableActions}`); // Add debug log
        if (!(state in this.qTable)) {
            this.qTable[state] = Array(availableActions.length).fill(0);
        }

        if (!(nextState in this.qTable)) {
            this.qTable[nextState] = Array(availableActions.length).fill(0);
        }

        let bestNextAction = Math.max(...this.qTable[nextState]);
        let tdTarget = reward + this.gamma * bestNextAction;
        let tdError = tdTarget - this.qTable[state][action];
        this.qTable[state][action] += this.alpha * tdError;

        this.storeState(state, this.qTable[state]);
    }

    storeState(state, qValues) {
        console.log(`Storing state: ${state} with Q-values: ${qValues}`); // Add debug log
        fetch('php/store_state.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                state: state,
                score: Math.max(...qValues),
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') {
                console.error('Error storing state:', data.message);
            }
        });
    }

    getQValue(state) {
        return fetch('php/get_state.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                state: state,
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                return data.qValues;
            } else {
                return null;
            }
        });
    }
}

export default QLearningAgent;
