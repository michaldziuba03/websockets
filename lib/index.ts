import { Server } from 'http';
import { readFrame } from './frame';
import { createWsAcceptKey, finalizeHandshake, handleBadWebsocketConnection, validateHeaders } from './http';

const server = new Server((req, res) => {
    const headers = req.headers;

    try {
        validateHeaders(req.headers);
    } catch (err) {
        handleBadWebsocketConnection(res);
    }
    
    const wsKey = headers['sec-websocket-key'];
    const wsAcceptKey = createWsAcceptKey(wsKey!);
    finalizeHandshake(res, wsAcceptKey);

    req.socket.on('data', (buff) => {
        const frame = readFrame(buff);
    });
})


server.listen(8080);
console.log("Server starting...");