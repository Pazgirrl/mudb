import net = require('net');
import dgram = require('dgram');

import {
    MuSocket,
    MuSocketState,
    MuSocketSpec,
    MuSessionId,
} from 'mudb/socket';

export class MuNetSocket implements MuSocket {
    public readonly sessionId:MuSessionId;
    public state = MuSocketState.INIT;

    private _reliableSocket:net.Socket;
    private _connectOpts:net.TcpSocketConnectOpts;

    private _unreliableSocket:dgram.Socket;
    private _bindOpts:dgram.BindOptions;

    // destination port, and hostname or IP address
    // for sending unreliable messages
    private _remotePort:number;
    private _remoteAddress:string;

    constructor (spec:{
        sessionId:MuSessionId,
        connectOpts:net.TcpSocketConnectOpts,
        bindOpts:dgram.BindOptions,
        tcpSocket?:net.Socket,
        udpSocket?:dgram.Socket,
    }) {
        this.sessionId = spec.sessionId;

        this._reliableSocket = spec.tcpSocket || new net.Socket();
        this._connectOpts = spec.connectOpts;

        this._unreliableSocket = spec.udpSocket || dgram.createSocket({
            type: 'udp4',
        });
        this._bindOpts = spec.bindOpts;
    }

    public open (spec:MuSocketSpec) {
        if (this.state !== MuSocketState.INIT) {
            throw new Error('mudb/net-socket: socket was already opened');
        }

        this._reliableSocket.connect(
            this._connectOpts,
            () => {
                this.state = MuSocketState.OPEN;

                this._reliableSocket.once('data', (opts_) => {
                    if (this.state === MuSocketState.CLOSED) {
                        this._reliableSocket.end();
                        return;
                    }

                    if (typeof opts_ === 'string') {
                        const opts = JSON.parse(opts_);
                        this._remotePort = opts.port;
                        this._remoteAddress = opts.address;

                        this._reliableSocket.on('data', (data) => {
                            if (this.state !== MuSocketState.OPEN) {
                                return;
                            }

                            if (typeof data === 'string') {
                                spec.message(data, false);
                            } else {
                                spec.message(new Uint8Array(data), false);
                            }
                        });
                        this._reliableSocket.on('close', (hadError) => {
                            this.state = MuSocketState.CLOSED;
                            spec.close();

                            if (hadError) {
                                console.error('mudb/net-socket: socket was closed due to a transmission error');
                            }
                        });
                    }
                });

                this._unreliableSocket.bind(
                    this._bindOpts,
                    () => {
                        this._unreliableSocket.on('message', (msg) => {
                            if (this.state !== MuSocketState.OPEN) {
                                return;
                            }
                            spec.message(new Uint8Array(msg), true);
                        });

                        const udpInfo = this._unreliableSocket.address();
                        this._reliableSocket.write(JSON.stringify({
                            sessionId: this.sessionId,
                            port: udpInfo.port,
                            address: udpInfo.address,
                        }));

                        spec.ready();
                    },
                );
            },
        );
    }

    public send (data:Uint8Array, unreliable?:boolean) {
        if (this.state !== MuSocketState.OPEN) {
            return;
        }

        if (unreliable) {
            this._unreliableSocket.send(data, this._remotePort, this._remoteAddress);
        } else {
            this._reliableSocket.write(data);
        }
    }

    public close () {
        if (this.state === MuSocketState.CLOSED) {
            return;
        }

        this.state = MuSocketState.CLOSED;

        this._reliableSocket.end();
        this._unreliableSocket.close();
    }
}
