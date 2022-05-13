export interface IFrame {
    fin: boolean;
    rsv1: number;
    rsv2: number;
    rsv3: number;
    opcode: number;
    mask: boolean;
    payloadLen: number;
    payload: Buffer;
}
