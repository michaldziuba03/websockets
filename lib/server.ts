import { Server } from 'http';
import { WebsocketConnection } from './connection';
import { createWsAcceptKey, finalizeHandshake, handleBadWebsocketConnection, validateHeaders } from './http';
import { OnDataListener } from './interfaces';

export class WebsocketServer {
    private onData: OnDataListener | undefined;

    on(eventName: 'data', cb: OnDataListener) {
        this.onData = cb;
    }

    listen(port: number | string) {
        const server = new Server((req, res) => {
            if (req.httpVersion === '1.0') {    // HTTP version 1.0 cannot handle Websocket protocol
                return handleBadWebsocketConnection(res);
            }
        
            const headers = req.headers;
        
            try {
                validateHeaders(req.headers);
            } catch (err) {
                handleBadWebsocketConnection(res);
            }
            
            const wsKey = headers['sec-websocket-key'];
            const wsAcceptKey = createWsAcceptKey(wsKey!);
            finalizeHandshake(res, wsAcceptKey);
        
            const connection = new WebsocketConnection(req.socket);
            connection.onData = this.onData;
        })
        
        server.listen(port);
    }
}