import app from './app.js'
import config from './utils/config.js'
import logger from './utils/logger.js'
import { Server } from "socket.io";
import { createServer } from 'http'
import socketHandler from './services/socketHandler.js';

const server = createServer(app);
const io = new Server(server);

socketHandler(io);

server.listen(config.PORT, () => {
	logger.info(`Http server running on port ${config.PORT}`)
})

	