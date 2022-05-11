import { Server, ServerResponse } from 'http';
import { createHash } from 'crypto';

function handleBadWebsocketConnection(res: ServerResponse) {
    res.statusCode = 400;
    res.write("<h1> Bad request </h1>");
    res.end();
}

function hashWebsocketKey(wsKey: string): string {
    const uuid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; //randomUUID();
    const hash = createHash('sha1');
    
    const dataToHash = wsKey + uuid
    return hash.update(Buffer.from(dataToHash))
        .digest('base64');
}

const server = new Server((req, res) => {
    const headers = req.headers;
    console.log(`Headers`, headers);

    if (!headers.upgrade || headers.upgrade !== "websocket") {
        handleBadWebsocketConnection(res);
        return;
    }

    const wsKey = headers['sec-websocket-key'];
    
    const responseWsKey = hashWebsocketKey(wsKey!);
    console.log(responseWsKey);

    res.statusCode = 101;
    // set headers:
    res.setHeader('Upgrade', 'websocket');
    res.setHeader('Connection', 'Upgrade');
    res.setHeader('Sec-WebSocket-Accept', responseWsKey);
    
    res.write('\r\n');
    res.end();

    req.socket.on('data', (buff) => {
        console.log('new data');
    });
})

server.listen(8080);
console.log("Server starting...");