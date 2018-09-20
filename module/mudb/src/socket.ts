export type MuSessionId = string;

export type MuData = Uint8Array | string;

export type MuReadyHandler = () => void;
export type MuMessageHandler = (data:MuData, unreliable:boolean) => void;
export type MuCloseHandler = (error?:any) => void;
export type MuConnectionHandler = (socket:MuSocket) => void;

export enum MuSocketState {
    INIT,
    OPEN,
    CLOSED,
}

export type MuSocketSpec = {
    ready:MuReadyHandler;
    message:MuMessageHandler;
    close:MuCloseHandler;
};

export interface MuSocket {
    sessionId:MuSessionId;
    state:MuSocketState;

    open(spec:MuSocketSpec);
    send(data:MuData, unreliable?:boolean);
    close();
}

export enum MuSocketServerState {
    INIT,
    RUNNING,
    SHUTDOWN,
}

export type MuSocketServerSpec = {
    ready:MuReadyHandler;
    connection:MuConnectionHandler;
    close:MuCloseHandler;
};

export interface MuSocketServer {
    clients:MuSocket[];
    state:MuSocketServerState;

    start(spec:MuSocketServerSpec);
    close();
}

export class MuMultiSocketServer implements MuSocketServer {
    private _state = MuSocketServerState.INIT;

    get state () : MuSocketServerState {
        return this._state;
    }

    public clients:MuSocket[] = [];

    private _servers:MuSocketServer[];
    private _numOnlineServers = 0;

    private _onready:MuReadyHandler = () => { };
    private _onclose:MuCloseHandler = () => { };

    constructor (servers:MuSocketServer[]) {
        this._servers = servers;
    }

    public start (spec:MuSocketServerSpec) {
        this._onready = spec.ready;
        this._onclose = spec.close;

        for (let i = 0; i < this._servers.length; ++i) {
            this._servers[i].start({
                ready: () => {
                    ++this._numOnlineServers;
                },
                connection: spec.connection,
                close: () => {
                    --this._numOnlineServers;
                },
            });
        }

        const startHandle = setInterval(
            () => {
                if (this._numOnlineServers < this._servers.length) {
                    return;
                }

                clearInterval(startHandle);

                this._state = MuSocketServerState.RUNNING;
                this._onready();
            },
            300,
        );
    }

    public close () {
        for (let i = 0; i < this._servers.length; ++i) {
            this._servers[i].close();
        }

        const closeHandle = setInterval(
            () => {
                if (this._numOnlineServers > 0) {
                    return;
                }

                clearInterval(closeHandle);

                this._state = MuSocketServerState.SHUTDOWN;
                this._onclose();
            },
            300,
        );
    }
}
