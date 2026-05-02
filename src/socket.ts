import http from 'http';
import app from './app.js';
import { WebSocketServer } from 'ws';


const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws ,req) => {
  console.log('New WebSocket connection established');
  if(req.url === '/ws/multiplayer') {
      ws.on('message', (message) => {
    console.log('Received message:', message.toString());
    // Echo the message back to the client
    ws.send(`Server received: ${message}`);
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });


  }

});



export default server;