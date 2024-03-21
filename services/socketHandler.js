// socketHandler.js

import logger from '../utils/logger.js';

const socketHandler = (io) => {

		const rooms = {};

    io.on('connection', (socket) => {
        logger.info('New connection');

				socket.emit('connected', 'Welcome to the chat!');

        socket.on('message', (message) => {
            logger.info(`Message: ${message}`);
            io.emit('message', message);
        });

				socket.on('newRoom', (room) => {	
					logger.info(`Creating new room: ${room}`);
					rooms[room] = room;
					socket.join(room);
					logger.info(`New room created: ${room}`);
				});

    });

		io.on('connect_error', (error) => {
			logger.error(`Connection error: ${error}`);
	});
	
		
};

export default socketHandler;