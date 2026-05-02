
import WebSocket from 'ws';




//optimise this functiono to efficiently generate unique room ids and handle potential collisions
const generateRandomRoomId = (): number => {
    return Math.floor(100000 + Math.random() * 900000);
};




const handleSocketConnection = (socket: WebSocket) => {
    

};

export { generateRandomRoomId };