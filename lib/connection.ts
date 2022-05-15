import { Socket } from "net";
import { readFrame, unmask } from "./frame";
import { IFragmentedFrame, IFrame } from "./interfaces";
import { Message, OnDataListener } from "./interfaces";
import { getMessageType, joinPayload } from "./utils";

export class WebsocketConnection {
    private socket: Socket;
    private frames: IFrame[] = [];
    private fragmentedFrame: IFragmentedFrame | undefined;
    
    public onData: OnDataListener | undefined;

    constructor(socket: Socket) {
        this.socket = socket;
        socket.on('data', this.handleData.bind(this));
    }

    handleClose() {}

    handleCompletedFrame(frame: IFrame) {
        // checks for control frames:
        const controlFrames = [0x8, 0x9, 0xA];
        if (controlFrames.includes(frame.opcode)) {
            this.handleControlFrame(frame);
            return;
        }

        const allowedOpcodes = [0x1, 0x2, 0x0];
        if (allowedOpcodes.includes(frame.opcode)) {
            this.frames.push(frame);
        }

        if (frame.fin) {
            // do something with whole data;
            if (this.onData) {
                const data = joinPayload(this.frames);
                const type = getMessageType(this.frames[0]);

                const message: Message = {
                    data,
                    type,
                }

                this.onData(message);
            }

            this.frames = [];
        }
    }

    

    handleControlFrame(frame: IFrame) {
        switch (frame.opcode) {
            case 0x8:
                console.log('Closing connection...');
                this.socket.end();
                break;
            case 0x9:
                console.log('Ping control frame...');
                break;
            case 0xA:
                console.log('Pong control frame...');
                break;
        }
    }

    handleData(buff: Buffer) {
        if (this.fragmentedFrame) {
            buff = this.handleFragmentedFrame(buff);
        }

        if (buff.byteLength === 0) {
            return; 
        }

        const frame = readFrame(buff);
        if (!frame.isCompleted) {
            this.fragmentedFrame = frame;
            return;
        }

        this.handleCompletedFrame(frame);

        let size = buff.byteLength - frame.frameLen;
        let chunkIndex = frame.frameLen;

        // handling multiple WS frames in one TCP data stream:
        while (size > 0) {
            const chunk = buff.slice(chunkIndex);
            const anotherFrame = readFrame(chunk);
            
            if (anotherFrame.isCompleted) {
                this.handleCompletedFrame(anotherFrame);
                size -= anotherFrame.frameLen;
                chunkIndex += anotherFrame.frameLen;
            } else {
                this.fragmentedFrame = anotherFrame;
                break;
            }
        }
    }

    handleFragmentedFrame(buff: Buffer) {
        const remainingByteLength = this.fragmentedFrame!.payloadLen - this.fragmentedFrame!.rawPayload.byteLength;

        if (remainingByteLength > buff.byteLength) {  // that means whole data buff is part of previous frame's payload. 
            this.fragmentedFrame!.rawPayload = Buffer.concat(
                [this.fragmentedFrame!.rawPayload, buff], 
                this.fragmentedFrame!.rawPayload.byteLength + buff.byteLength,
            );

            return Buffer.alloc(0);
        }

        // we take remaining part of previous frame's payload from data buffer.
        const remainingPart = buff.slice(0, remainingByteLength);
        this.fragmentedFrame!.rawPayload = Buffer.concat(
            [this.fragmentedFrame!.rawPayload, remainingPart],
            this.fragmentedFrame!.rawPayload.byteLength + remainingByteLength,
        );

        const payload = this.fragmentedFrame!.mask ? unmask(
            this.fragmentedFrame!.rawPayload, 
            this.fragmentedFrame!.payloadLen, 
            this.fragmentedFrame!.maskingKey) : this.fragmentedFrame!.rawPayload;

        const frame: IFrame = {
            fin: this.fragmentedFrame!.fin,
            rsv1: this.fragmentedFrame!.rsv1,
            rsv2: this.fragmentedFrame!.rsv2,
            rsv3: this.fragmentedFrame!.rsv3,
            opcode: this.fragmentedFrame!.opcode,
            mask: this.fragmentedFrame!.mask,
            payloadLen: this.fragmentedFrame!.payloadLen,
            payload,
            frameLen: this.fragmentedFrame!.byteOffset + payload.byteLength,
            isCompleted: true,
        }

        this.fragmentedFrame = undefined;
        //this.frames.push(frame);
        this.handleCompletedFrame(frame);

        return buff.slice(remainingByteLength);
    }
}