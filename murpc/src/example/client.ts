import { RPCSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuRPCClient } from '../client';

export  = function (client:MuClient) {
    const protocol = new MuRPCClient(client, RPCSchema);
    protocol.configure({
        rpc: {

        },
        ready: () => {
            console.log('client ready');
            protocol.server.rpc.combine([1, 2], (result) => {
                console.log('rpc combine result:', result);
            });
        },
    });
    client.start();
};
