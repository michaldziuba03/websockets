import { Socket } from "net";
import { ClosureStatus, CONTROL_FRAMES, DATA_FRAMES, STATUS_DESCRIPTION } from "./constants";
import { WebSocketError } from "./errors";
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
        socket.setKeepAlive(true);
        socket.setTimeout(0);
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

    closeConnection(status: ClosureStatus) {
        const fin = true;
        const opcode = 0x8;

        const description = STATUS_DESCRIPTION[status] || '';

        const statusBuffer = Buffer.alloc(2)
        const descriptionBuffer = Buffer.from(description);

        const payload = Buffer.concat([statusBuffer, descriptionBuffer], statusBuffer.byteLength+descriptionBuffer.byteLength);

        const closingFrame = this.parser.createFrame(payload, {
            fin,
            opcode,
        });

        this.socket.write(closingFrame);
        this.socket.end();
    }

    // Control frame: frames with opcode = 0x8, 0x9 or 0xA;
    handleControlFrame(frame: IFrame) {
        switch (frame.opcode) {
            case 0x8:
                console.log('Closing connection...');
                this.closeConnection(ClosureStatus.NORMAL);
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
            throw new WebSocketError(ClosureStatus.WRONG_DATA_TYPE);
        }

        // server expects continuation frames!
        if (frame.opcode !== 0x0 && this.frames.length > 0) {
            throw new WebSocketError(ClosureStatus.NON_CONSISTENT_TYPE);
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
        throw new WebSocketError(ClosureStatus.PROTOCOL_ERROR);
    }

    handleData(buff: Buffer) {
        try {
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
        } catch (err) {
            if (err instanceof WebSocketError) {
                this.closeConnection(err.statusCode);
                return;
            }

            this.closeConnection(ClosureStatus.POLICY_VIOLATION);
        }
    }
}