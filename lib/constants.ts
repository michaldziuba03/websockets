export const SUPPORTED_VERSION = 13;

// accepted opcodes:
export const CONTROL_FRAMES = [0x8, 0x9, 0xA];
export const DATA_FRAMES = [0x0, 0x1, 0x2];

export enum ClosureStatus {
    NORMAL = 1000,
    SERVER_DOWN = 1001,
    PROTOCOL_ERROR = 1002,
    WRONG_DATA_TYPE = 1003,
    NON_CONSISTENT_TYPE = 1007,
    POLICY_VIOLATION = 1008,
}

export const STATUS_DESCRIPTION = {
    1000: 'Normal connection closure',
    1001: 'Server is going away',
    1002: 'Protocol error',
    1003: 'Invalid data type',
    1007: 'Not consistent data type',
    1008: 'Policy violation',
}