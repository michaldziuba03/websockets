import { writeFileSync } from 'fs';
import { Server } from 'http';
import { readFrame, unmask } from './frame';
import { createWsAcceptKey, finalizeHandshake, handleBadWebsocketConnection, validateHeaders } from './http';
import { IFrame, IUncompletedFrame } from './interfaces';

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

    let frameToComplete: IUncompletedFrame | undefined;
    let frames: IFrame[] = [];

    req.socket.on('data', (buff) => {
        if (frameToComplete) {
            const additionalBytes = frameToComplete.payloadLen - frameToComplete.rawPayload.byteLength;
            if (additionalBytes > buff.byteLength) {
                frameToComplete.rawPayload = Buffer.concat(
                    [frameToComplete.rawPayload, buff], 
                    frameToComplete.rawPayload.byteLength + buff.byteLength,
                );

                return;
            }

            const lastFramePart = buff.slice(0, additionalBytes);
            frameToComplete.rawPayload = Buffer.concat(
                [frameToComplete.rawPayload, lastFramePart], 
                frameToComplete.rawPayload.byteLength + additionalBytes,
            );

            // read frame;
            buff = buff.slice(additionalBytes);
            const payload = frameToComplete.mask ? unmask(
                frameToComplete.rawPayload, 
                frameToComplete.payloadLen, 
                frameToComplete.maskingKey) : frameToComplete.rawPayload;

            const frame: IFrame = {
                fin: frameToComplete.fin,
                rsv1: frameToComplete.rsv1,
                rsv2: frameToComplete.rsv2,
                rsv3: frameToComplete.rsv3,
                opcode: frameToComplete.opcode,
                mask: frameToComplete.mask,
                payloadLen: frameToComplete.payloadLen,
                payload,
                frameLen: frameToComplete.byteOffset + payload.byteLength,
                isCompleted: true,
            }

            console.log(frame);
            frames.push(frame);
            if (frame.fin) {
                doSomethingWithFrames(frames);
                frames = [];
            }
            frameToComplete = undefined;
        }

        if (buff.byteLength <= 0) {
            return;
        }

        const frame = readFrame(buff);

        if (!frame.isCompleted) {
            frameToComplete = frame;
            return;
        }

        console.log(frame);
        frames.push(frame);
        if (frame.fin) {
            doSomethingWithFrames(frames); 
            frames = [];
        }
        //printPayload(frame)

        let size = buff.byteLength - frame.frameLen;
        let chunkIndex = frame.frameLen;
        console.log(size);

        while (size > 0) {
            const chunk = buff.slice(chunkIndex);
            const anotherFrame = readFrame(chunk);
            
            if (anotherFrame.isCompleted) {
                console.log(anotherFrame);
                frames.push(anotherFrame);
                if (anotherFrame.fin) {
                    doSomethingWithFrames(frames);
                    frames = [];
                }        //printPayload(anotherFrame)

                size -= anotherFrame.frameLen;
                chunkIndex += anotherFrame.frameLen;
            } else {
                frameToComplete = anotherFrame;
                break;
            }
        }
    });
})

function doSomethingWithFrames(frames: IFrame[]) {
    let totalLen = 0;
    const payloads = frames.map((frame) => {
        totalLen += frame.payloadLen;

        return frame.payload
    });

    const image = Buffer.concat(payloads, totalLen);
    writeFileSync('./footage.mp4', image);
}

function printPayload(frame: IFrame) {
    if (frame.opcode === 0x1) {
        console.log(frame.payload.toString('utf-8'));
    }

    if (frame.opcode === 0x0) {
        console.log(frame.payload.toString('utf-8'));
    }

    if (frame.opcode === 0x2) {
        console.log(frame.payload);
    }
}

server.listen(8080);
console.log("Server starting...");