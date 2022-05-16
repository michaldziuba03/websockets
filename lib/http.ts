import { createHash } from "crypto";
import { IncomingHttpHeaders, ServerResponse } from "http";
import { SUPPORTED_VERSION } from "./constants";

export function handleBadWebsocketConnection(res: ServerResponse) {
    res.statusCode = 400;
    res.write("<h1> Bad request </h1>");
    res.end();
}

// FIRST STEP:
export function validateHeaders(headers: IncomingHttpHeaders) {
    if (!headers.upgrade || headers.upgrade !== "websocket") {
        throw Error('Upgrade header is requried for WebSocket handshake.');
    }

    if (!headers['sec-websocket-key']) {
        throw Error('WebSocket key is required.');
    }    

    if (!headers['sec-websocket-version']) {
        throw Error('Protocol version not specified');
    }

    const version = Number(headers['sec-websocket-version']);
    if (version !== SUPPORTED_VERSION) {
        throw Error('Upgrade protocol version');
    }
}

// SECOND STEP:
export function createWsAcceptKey(wsKey: string): string {
    const uuid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // constant GUID definied in WS docs
    const dataToHash = wsKey + uuid

    return createHash('sha1')
        .update(Buffer.from(dataToHash))
        .digest('base64');
}

// FINAL STEP:
export function finalizeHandshake(res: ServerResponse, wsAcceptKey: string) {
    res.statusCode = 101;
    
    // set headers:
    res.setHeader('Upgrade', 'websocket');
    res.setHeader('Connection', 'Upgrade');
    res.setHeader('Sec-WebSocket-Accept', wsAcceptKey);
    
    res.write('\r\n');
    res.end();
}