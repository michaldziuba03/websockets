import { writeFileSync } from "fs";
import { WebsocketServer } from "./server";

const wsServer = new WebsocketServer();

wsServer.on('data', (msg) => {
    if (msg.type === 'binary') {
        console.log('Got binary data');
        writeFileSync('img.png', msg.data);
    }
    else {
        console.log('GOt string:', msg.data.toString('utf-8'));
    }
});

console.log("Server starting...");

wsServer.listen(8080);