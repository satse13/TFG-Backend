import socketio from 'socket.io';
import logger from '../utils/logger.js';

export default server => {
  const io = socketio.listen(server);

	logger.info('Socket listening');

  io.on('connection', async socket => {

		logger.info('New client connected');

		const { username, roomId, time, action } = socket.handshake.query;
		const room = new Room({ socket, username, roomId, time, action });

		const joinedRoom = await room.init(username);

		if (joinedRoom) {
			room.isReady();
			room.showPlayers();
		}

		room.onDisconnect();

  });

  return io;
};