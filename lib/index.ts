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
        console.log('Frames');
        const frame = readFrame(buff);
        console.log(frame);

        let size = buff.byteLength - frame.frameLen;
        let chunkIndex = frame.frameLen;

        while (size > 0) {
            const chunk = buff.slice(chunkIndex);
            const anotherFrame = readFrame(chunk);
            
            console.log(anotherFrame);

            size -= anotherFrame.frameLen;
            chunkIndex += anotherFrame.frameLen;
        }
    });
})

server.listen(8080);
console.log("Server starting...");