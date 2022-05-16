import { ClosureStatus } from "./constants";

export class WebSocketError extends Error {
    public statusCode: number

    constructor(statusCode: ClosureStatus) {
        super(`WebSocket error code: ${statusCode}`);
        this.statusCode = statusCode;
    }
}
