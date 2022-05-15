import { IFrame } from "./interfaces";

export function joinPayload(frames: IFrame[]) {
    let totalLen = 0;
    const buffers = frames.map(frame => {
        totalLen += frame.payload.byteLength;
        return frame.payload;
    });

    return Buffer.concat(buffers, totalLen);
}

export function getMessageType(firstFrame: IFrame) {
    switch (firstFrame.opcode) {
        case 0x1:
            return 'string';
        case 0x2:
            return 'binary'
        default:
            throw Error('Unknown frame opcode');
    }
}