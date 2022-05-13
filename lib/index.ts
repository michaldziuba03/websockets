import { Server } from 'http';
import { createReplyFrame, readFrame } from './frame';
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
        
        if (frame.opcode === 0x1) {
            console.log(frame.payload.toString('utf-8'));
        }

        if (frame.opcode === 0x8) {
            console.log('Closing connection...');
            req.socket.end();
        }
    });
})


server.listen(8080);
console.log("Server starting...");