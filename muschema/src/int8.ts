import { MuNumber } from './_number';
import { MuWriteStream, MuReadStream } from 'mustreams';

export class MuInt8 extends MuNumber {
    public readonly muType = 'int8';

    constructor(value?:number) {
        super((value || 0) << 24 >> 24);
    }

    public diffBinary (base:number, target:number, stream:MuWriteStream) {
        const bi = base | 0;
        const ti = target | 0;
        if (bi !== ti) {
            stream.grow(1);
            stream.writeInt8(ti);
            return true;
        }
        return false;
    }

    public patchBinary (base:number, stream:MuReadStream) {
        if (stream.bytesLeft() > 0) {
            return stream.readInt8();
        }
        return base;
    }

    public getByteLength (x:MuInt8) {
        return 1;
    }
}
