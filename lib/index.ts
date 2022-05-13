import { Server, ServerResponse } from 'http';
import { createHash } from 'crypto';

function handleBadWebsocketConnection(res: ServerResponse) {
    res.statusCode = 400;
    res.write("<h1> Bad request </h1>");
    res.end();
}

function hashWebsocketKey(wsKey: string): string {
    const uuid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
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
        readFrame(buff);
    });
})

interface IFrame {
    fin: boolean;
    rsv1: number;
    rsv2: number;
    rsv3: number;
    opcode: number;
    mask: boolean;
    payloadLen: number;
    payload: Buffer;
}

function readFrame(chunk: Buffer) {
    // parsing first byte of frame:
    let byteOffset = 0;
    const firstByte = chunk.readUint8(byteOffset);

    const fin = (firstByte >> 7) & 0x1;

    const rsv1 = (firstByte >> 6) & 0x1;
    const rsv2 = (firstByte >> 5) & 0x1;
    const rsv3 = (firstByte >> 4) & 0x1;

    const opcode = firstByte & 15;
    
    // parsing second byte of frame:
    byteOffset++;
    const secondByte = chunk.readUInt8(byteOffset);

    const mask = (secondByte >> 7) & 0x1;
    let payloadLen = secondByte & 127;

    // parsing another bytes of frame:
    byteOffset++;

    if (payloadLen === 126) {
        payloadLen = chunk.readUint16BE(byteOffset);

        byteOffset += 2; // because we read 16 bits (2 bytes).
    }

    if (payloadLen === 127) {
        const biguintLen = chunk.readBigUint64BE(byteOffset);
        payloadLen = Number(biguintLen); // bad and slow way.
        byteOffset += 8; // because we read 64 bits (8 bytes).
    }

    let maskingKey = Buffer.alloc(4); //0;
    if (mask) {
        maskingKey = chunk.slice(byteOffset, byteOffset + 4) //chunk.readUInt32BE(byteOffset);
        byteOffset += 4; // because we read 32 bits (4 bytes).
    }

    const rawPayload = chunk.slice(byteOffset);
    const payload = Buffer.alloc(payloadLen);

    for (let i = 0; i < payloadLen; i++) {
        const j = i % 4;
        const decoded = rawPayload[i] ^ (maskingKey[j]);

        payload.writeUInt8(decoded, i);
    }

    console.log('data:', payload.toString('utf-8'));

    const frame: IFrame = {
        fin: Boolean(fin),
        rsv1,
        rsv2,
        rsv3,
        opcode,
        mask: Boolean(mask),
        payloadLen,
        payload,
    }

    console.log(frame);
}

function dec2bin(dec: number) {
    return (dec >>> 0).toString(2);
}

server.listen(8080);
console.log("Server starting...");