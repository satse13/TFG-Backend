import { Server, Socket } from 'socket.io';
import { Adapter } from 'socket.io-adapter';
import { config } from '../utils/config.js';

const { MAX_PLAYERS } = config;

export default class Room {
	
  constructor(options) {

		this.io = io.of('/');
    this.socket = options.socket;
    this.username = options.username;
    this.roomId = options.roomId;
    this.action = options.action; // [join, create]
    this.store = this.io.adapter; // Later expanded to io.adapter.rooms[roomId]
		this.time = options.time;
		
    this.options = {
      maxPlayersLimit: MAX_PLAYERS,
    };

  }

  async init(username) {
    // Stores an array containing socket ids in 'roomId'
    const clients = await this.io.in(this.roomId).allSockets();
    if (!clients) {
      logger.error('[INTERNAL ERROR] Room creation failed!');
    }

    logger.debug(`Connected Clients are: ${clients}`);

    if (this.action === 'join') {
     
      this.store = this.store.rooms.get(this.roomId);
      if (clients.size > 0) {

        await this.socket.join(this.roomId);
        this.store.clients.push({ id: this.socket.id, username, isReady: false });
        this.socket.username = username;
        this.socket.emit('[SUCCESS] Successfully initialised', {
          roomId: this.roomId,
          options: this.options,
        });
        logger.info(`[JOIN] Client joined room ${this.roomId}`);
        return true;
      }

      logger.warn(`[JOIN FAILED] Client denied join, as roomId ${this.roomId} not created`);
      this.socket.emit('Error: Create a room first!');
      return false;
    }

    if (this.action === 'create') {
      // Check if room size is equal to zero
      //     If yes, create new room and join socket to the room
      //     If not, emit 'invalid operation: room already exists'

      if (clients.size === 0) {
        await this.socket.join(this.roomId);
        this.store = this.store.rooms.get(this.roomId);

        this.store.clients = [{ id: this.socket.id, username, isReady: false }];

        this.socket.username = username;
        logger.info(`[CREATE] Client created and joined room ${this.roomId}`);
        this.socket.emit('[SUCCESS] Successfully initialised', {
          roomId: this.roomId,
          options: this.options,
        });
        return true;
      }

      logger.warn(`[CREATE FAILED] Client denied create, as roomId ${this.roomId} already present`);
      this.socket.emit('Error: Room already created. Join the room!');
      return false;
    }
  }

  isReady() {
    this.socket.on('is-ready', () => {
      for (const player of this.store.clients) {
        if (player.id === this.socket.id) {
          player.isReady = true;
        }
      }
      const arePlayersReady = this.store.clients.every(player => player.isReady === true);
      if (arePlayersReady) {
        this.beginGame();
      }
    });
  }


  beginGame() {
    this.io.to(this.roomId).emit('game-start', 'The game is about to start');
    logger.info('Game started...');

    // Reset draft object to initial state
    this._resetCurrentGame();

    this._emitTurn(0);
  }


  endGame() {
    // TODO: Save the teams in DB as a collection
    this.io.to(this.roomId).emit('game-end', 'The game has ended');
  }

  _nextTurn() {
    this.io
      .to(this.roomId)
      .emit('player-turn-end', `${this.store.clients[this.store.draft.turnNum].username} chance ended`);
    this.io.to(this.store.clients[this.store.draft.turnNum].id).emit('personal-turn-end', 'Your chance ended');

    logger.info(`[TURN CHANGE] ${this.store.clients[this.store.draft.turnNum].username} had timeout turn change`);

    const currentTurnNumber = (this.store.draft.turnNum + 1) % this.store.clients.length;
    this.store.draft.turnNum = currentTurnNumber;

    this._emitTurn(currentTurnNumber);
  }

  _emitTurn(currentTurnNumber) {
    this.io.to(this.store.clients[currentTurnNumber].id).emit('personal-turn-start', 'It is your chance to play');
    this.io.to(this.roomId).emit('player-turn-start', `${this.store.clients[currentTurnNumber].username} is playing`);
    logger.info(
      `[TURN CHANGE] ${this.store.clients[currentTurnNumber].username} is the new drafter. Turn number: ${currentTurnNumber}`
    );
    // this._triggerTimeout();
  }

  _resetCurrentGame() {
    if (this.store) {
      // this._resetTimeOut();
      this.store.draft = {
        sTime: new Date(),
        timeOut: 0,
        turnNum: 0,
        maxPlayersLimit: this.options.maxPlayersLimit,
        maxTimerLimit: this.time,
      };
    }

    if (this.options) {
      logger.info(`[USER-CONFIG] ${JSON.stringify(this.options)}`);
    } else {
      logger.info(`[DEFAULT-CONFIG] ${JSON.stringify(this.options)}`);
    }
  }

  /**
   * Gracefully disconnect the user from the game and end the draft
   * Preserving the gameState
   *
   * @access    public
   */
  onDisconnect() {
    this.socket.on('disconnect', () => {
      try {
        this.store.clients = this.store.clients.filter(player => player.id !== this.socket.id);

        // Handle game reset
        // this._resetTimeOut();
        this.endGame();
        this._resetCurrentGame();
      } catch {
        logger.info('[FORCE DISCONNECT] Server closed forcefully');
      }

      logger.info('Client Disconnected!');
    });
  }
}