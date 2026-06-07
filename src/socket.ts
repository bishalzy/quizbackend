import http from 'http';
import app from './app.js';
import { WebSocketServer } from 'ws';
import { handleSocketConnection } from './multiplayerSocket/multisocket.service.js';
import { MULTIPLAYER_SOCKET_PATH } from './multiplayerSocket/general.js';
import { startTimerProcessor } from './multiplayerSocket/services/timer.service.js';


const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: MULTIPLAYER_SOCKET_PATH });

wss.on('connection', (ws, req) => {
  void handleSocketConnection(ws, req);

});

// start the Redis-backed timer processor for multi-process scheduling
startTimerProcessor();



export default server;