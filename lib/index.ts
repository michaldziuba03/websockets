import { WebsocketServer } from "./server";

const wsServer = new WebsocketServer();

wsServer.listen(8080);
wsServer.on('data', (msg) => {
    if (msg.type === 'binary') {
        console.log('Got binary data');
    }
    else {
        console.log('GOt string:', msg.data.toString('utf-8'));
    }
});

console.log("Server starting...");