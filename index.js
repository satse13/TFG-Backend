import app from './app.js'
import config from './utils/config.js'
import logger from './utils/logger.js'
import http from 'http';
import { socketHandler } from './socketHandler/index.js';

const server = http.createServer(app);
socketHandler(server);

app.listen(config.PORT, () => {
	logger.info(`Http server running on port ${config.PORT}`)
})

server.listen(config.PORT + 1, () => {
	logger.info(`Socketio initialised! on port ${config.PORT + 1}`)
});