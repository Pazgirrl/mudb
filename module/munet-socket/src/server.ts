import net = require('net');
import dgram = require('dgram');

import {
    MuSocketServer,
    MuSocketServerState,
    MuSocketServerSpec,
    MuSocket,
    MuSocketState,
    MuSocketSpec,
    MuSessionId,
    MuData,
    MuCloseHandler,
} from 'mudb/socket';

function noop () { }

class MuNetSocketClient implements MuSocket {
    public readonly sessionId:MuSessionId;
    public state = MuSocketState.INIT;

    private _reliableSocket:net.Socket;

    private _unreliableSocket:dgram.Socket;
    private _remotePort:number;
    private _remoteAddress:string;

    private _pendingMessages:MuData[] = [];

    private _onclose:MuCloseHandler = noop;

    constructor (
        sessionId:MuSessionId,
        reliableSocket:net.Socket,
        unreliableSocket:dgram.Socket,
        remotePort:number,
        remoteAddress:string,
        removeClient:() => void,
    ) {
        this.sessionId = sessionId;
        this._reliableSocket = reliableSocket;
        this._unreliableSocket = unreliableSocket;
        this._remotePort = remotePort;
        this._remoteAddress = remoteAddress;

        this._reliableSocket.on('data', (data) => {
            const msg = typeof data === 'string' ? data : new Uint8Array(data).slice();
            this._pendingMessages.push(msg);
        });
        this._reliableSocket.on('close', (hadError) => {
            this.state = MuSocketState.CLOSED;
            this._unreliableSocket.close();
            this._onclose();
            removeClient();
        });
    }

    public open (spec:MuSocketSpec) {
        if (this.state !== MuSocketState.INIT) {
            throw new Error('mudb/net-socket: socket was already opened');
        }

        setTimeout(
            () => {
                this.state = MuSocketState.OPEN;
                this._onclose = spec.close;

                spec.ready();

                this._reliableSocket.on('data', (data) => {
                    const msg = typeof data === 'string' ? data : new Uint8Array(data);
                    spec.message(msg, false);
                });

                for (let i = 0; i < this._pendingMessages.length; ++i) {
                    spec.message(this._pendingMessages[i], false);
                }
                this._pendingMessages.length = 0;
            },
            0,
        );
    }

    public send (data:MuData, unreliable?:boolean) {
        if (unreliable) {
            this._reliableSocket.write(data);
        } else {
            this._unreliableSocket.send(data, this._remotePort, this._remoteAddress);
        }
    }

    public close () {
        this._reliableSocket.end();
    }
}

export class MuNetSocketServer implements MuSocketServer {
    public clients:MuSocket[] = [];
    public state = MuSocketServerState.INIT;

    private _tcpServer:net.Server;
    private _udpServer:dgram.Socket;

    private _onclose:MuCloseHandler;

    constructor (spec:{
        tcpServer:net.Server,
        udpServer:dgram.Socket,
    }) {
        this._tcpServer = spec.tcpServer;
        this._udpServer = spec.udpServer;
    }

    public start (spec:MuSocketServerSpec) {
        if (this.state !== MuSocketServerState.INIT) {
            throw new Error('mudb/net-socket: server was already started');
        }

        setTimeout(
            () => {
                this._tcpServer.on('connection', (socket) => {
                    socket.once('data', (data) => {
                        try {
                            if (typeof data !== 'string') {
                                throw new Error('the first packet is not string');
                            }

                            const clientSpec = JSON.parse(data);
                            if (typeof clientSpec.sessionId !== 'string') {
                                throw new Error('bad session ID');
                            }

                            const udpInfo = this._udpServer.address();
                            socket.write(JSON.stringify({
                                port: udpInfo.port,
                                address: udpInfo.address,
                            }));

                            const client = new MuNetSocketClient(
                                clientSpec.sessionId,
                                socket,
                                this._udpServer,
                                clientSpec.port,
                                clientSpec.address,
                                () => this.clients.splice(this.clients.indexOf(client), 1),
                            );
                            this.clients.push(client);
                            spec.connection(client);
                        } catch (e) {
                            console.error(`mudb/net-socket: destroying socket due to ${e}`);
                            socket.destroy();
                        }
                    });
                });

                this._onclose = spec.close;
                this.state = MuSocketServerState.RUNNING;
                spec.ready();
            },
            0,
        );
    }

    public close () {
        if (this.state === MuSocketServerState.SHUTDOWN) {
            return;
        }

        this.state = MuSocketServerState.SHUTDOWN;
        this._tcpServer.close(this._onclose);
        this._udpServer.close();
    }
}
