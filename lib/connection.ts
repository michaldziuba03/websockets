import { Socket } from "net";
import { WebsocketParser } from "./frame";
import { IFrame } from "./interfaces";
import { OnDataListener } from "./interfaces";

export class WebsocketConnection {
    private socket: Socket;
    private frames: IFrame[] = [];
    private parser: WebsocketParser = new WebsocketParser();
    
    public onData: OnDataListener | undefined;

    constructor(socket: Socket) {
        this.socket = socket;
        socket.on('data', this.handleData.bind(this));
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
        let remainingBuff = this.parser.readFrame(buff);
        while (remainingBuff.byteLength > 0) {
            remainingBuff = this.parser.readFrame(remainingBuff);
        }

        console.log(this.parser.frames);
        this.parser.clearFrames();
    }
}