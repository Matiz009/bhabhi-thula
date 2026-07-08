class GameError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

module.exports = { GameError };
