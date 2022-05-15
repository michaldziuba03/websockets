export interface IFrame {
    fin: boolean;
    rsv1: number;
    rsv2: number;
    rsv3: number;
    opcode: number;
    mask: boolean;
    payloadLen: number;
    payload: Buffer;
    frameLen: number;
    isCompleted: true;
}

export interface IUncompletedFrame {
    fin: boolean;
    rsv1: number;
    rsv2: number;
    rsv3: number;
    opcode: number;
    mask: boolean;
    payloadLen: number;
    rawPayload: Buffer;
    isCompleted: false;
    maskingKey: Buffer;
    byteOffset: number;
}

export interface ICreateFrameOptions {
    fin: boolean;
    opcode: number;
}