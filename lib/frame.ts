import { ICreateFrameOptions, IFrame } from "./interfaces";

function generateFirstByte(options: ICreateFrameOptions): number {
    const { opcode, fin } = options;

    if (opcode === 0x1 && fin) {
        return 129;
    }

    if (opcode === 0x1 && !fin) {
        return 1;
    }

    if (opcode === 0x2 && fin) {
        return 130;
    }

    return 2;
}

export function createReplyFrame(payload: Buffer, options: ICreateFrameOptions) {
    const dataLen = payload.byteLength;

    const firstByte = generateFirstByte(options); // 129;
    const payloadLen = dataLen === 126 ? 126 : dataLen;
    const frameSize = 2 + (dataLen === 126 ? 2: 0) + dataLen; 

    const rawFrame = Buffer.alloc(frameSize);
    rawFrame.writeUInt8(firstByte, 0);
    rawFrame.writeUInt8(payloadLen, 1);
    
    let byteOffset = 2;
    if (dataLen === 126) {
        rawFrame.writeUInt16BE(dataLen, byteOffset);
        byteOffset++;
    }

    for (let i = 0; i < dataLen; i++) {
        rawFrame.writeUInt8(payload[i], byteOffset);
        byteOffset++;
    }

    return rawFrame;
}

export function readFrame(chunk: Buffer) {
    // parsing first byte of frame:
    let byteOffset = 0;
    const firstByte = chunk.readUint8(byteOffset);

    const fin = Boolean((firstByte >> 7) & 0x1);

    const rsv1 = (firstByte >> 6) & 0x1;
    const rsv2 = (firstByte >> 5) & 0x1;
    const rsv3 = (firstByte >> 4) & 0x1;

    const opcode = firstByte & 15;
    
    // parsing second byte of frame:
    byteOffset++;
    const secondByte = chunk.readUInt8(byteOffset);

    const mask = Boolean((secondByte >> 7) & 0x1);
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

    let maskingKey = Buffer.alloc(4);
    if (mask) {
        maskingKey = chunk.slice(byteOffset, byteOffset + 4) 
        byteOffset += 4; // because we read 4 bytes.
    }

    const rawPayload = chunk.slice(byteOffset);
    const payload = mask ? unmask(rawPayload, payloadLen, maskingKey) : rawPayload;

    const frame: IFrame = {
        fin,
        rsv1,
        rsv2,
        rsv3,
        opcode,
        mask,
        payloadLen,
        payload,
    }

    return frame;
}

function unmask(rawPayload: Buffer, payloadLen: number, maskingKey: Buffer) {
    const payload = Buffer.alloc(payloadLen);

    for (let i = 0; i < payloadLen; i++) {
        const j = i % 4;
        const decoded = rawPayload[i] ^ (maskingKey[j]);

        payload.writeUInt8(decoded, i);
    }

    return payload;
}