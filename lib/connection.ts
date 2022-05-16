import { Socket } from "net";
import { CONTROL_FRAMES, DATA_FRAMES } from "./constants";
import { WebsocketParser } from "./frame";
import { IFrame, Message } from "./interfaces";
import { OnDataListener } from "./interfaces";
import { getMessageType, joinPayload } from "./utils";

export class WebsocketConnection {
    private socket: Socket;
    private frames: IFrame[] = [];
    private parser: WebsocketParser = new WebsocketParser();
    
    public onData: OnDataListener | undefined;

    constructor(socket: Socket) {
        this.socket = socket;
        socket.on('data', this.handleData.bind(this));
    }

    handleMessage() {
        const data = joinPayload(this.frames);
        const type = getMessageType(this.frames[0]);

        if (!this.onData) return;
        
        const message: Message = {
            data,
            type,
        }

        this.onData(message);
    }

    // Control frame: frames with opcode = 0x8, 0x9 or 0xA;
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

    // Data frame: frames with opcode = 0x1, 0x2 or 0x0;
    handleDataFrame(frame: IFrame) {
        // continuation frame (0x0) cannot be first frame!
        if (frame.opcode === 0x0 && this.frames.length === 0) {
            throw Error('Invalid opcode');
        }

        // server expects continuation frames!
        if (frame.opcode !== 0x0 && this.frames.length > 0) {
            throw Error('Invalid opcode');
        }

        this.frames.push(frame);

        if (frame.fin) {
            // After completion of all frames - we can create websocket message!
            this.handleMessage();
            this.frames = [];
            return;
        }
    }

    // Unknown frame: frame with weird, undocumented or just random opcode;
    handleUnknownFrame() {
        throw Error('Invalid opcode');
    }

    handleData(buff: Buffer) {
        let remainingBuff = this.parser.readFrame(buff);
        while (remainingBuff.byteLength > 0) {
            remainingBuff = this.parser.readFrame(remainingBuff);
        }

        for (const frame of this.parser.frames) {
            if (DATA_FRAMES.includes(frame.opcode)) {
                this.handleDataFrame(frame);
            }

            else if (CONTROL_FRAMES.includes(frame.opcode)) {
                this.handleControlFrame(frame);
            }

            else {
                this.handleUnknownFrame();
            }
        }

        this.parser.clearFrames();
    }
}