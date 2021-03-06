import { MuWriteStream, MuReadStream } from 'mustreams';
import { randomValue } from '../test/helper';

export function createWriteStreams (numStreams:number) : MuWriteStream[] {
    const result = new Array(numStreams);
    for (let i = 0; i < numStreams; ++i) {
        result[i] = new MuWriteStream(1);
    }
    return result;
}

export function createReadStreams (outStreams:MuWriteStream[]) : MuReadStream[] {
    const result = new Array(outStreams.length);
    for (let i = 0; i < outStreams.length; ++i) {
        result[i] = new MuReadStream(outStreams[i].bytes());
        outStreams[i].destroy();
    }
    return result;
}

export function genArray (muType:string, length:number) {
    const result = new Array(length);
    for (let i = 0; i < length; ++i) {
        result[i] = randomValue(muType);
    }
    return result;
}

export function genDictionary (muType:string, numProps:number) {
    function propName () {
        const length = 10;
        const chars = new Array(length);
        for (let i = 0; i < length; ++i) {
            chars[i] = Math.random() * 26 + 97 | 0;
        }
        return String.fromCharCode.apply(String, chars);
    }

    const result = {};
    for (let i = 0; i < numProps; ++i) {
        result[propName()] = randomValue(muType);
    }
    return result;
}

export function changeValues<T extends object> (
    dict:T,
    muType:string,
) : T {
    const result = JSON.parse(JSON.stringify(dict));
    Object.keys(result).forEach((k) => {
        result[k] = randomValue(muType);
    });
    return result;
}

export function shallowMerge<T extends object> (target:T, source:T) : T {
    const result = JSON.parse(JSON.stringify(target));
    Object.keys(source).forEach((k) => {
        result[k] = source[k];
    });
    return result;
}

export function genStruct (spec) : any {
    const props = Object.keys(spec);
    const muTypes = props.map((p) => spec[p]['muType']);

    const result = {};
    props.forEach((p, idx) => {
        result[p] = randomValue(muTypes[idx]);
    });
    return result;
}

export const muType2ArrayType = {
    float32: Float32Array,
    float64: Float64Array,
    int8: Int8Array,
    int16: Int16Array,
    int32: Int32Array,
    uint8: Uint8Array,
    uint16: Uint16Array,
    uint32: Uint32Array,
};

export function genVector (muType:keyof typeof muType2ArrayType, dimension:number) {
    const result = new muType2ArrayType[muType](dimension);
    for (let i = 0; i < dimension; ++i) {
        result[i] = randomValue(muType);
    }
    return result;
}

export function calcContentBytes (outs:MuWriteStream[]) : number {
    function reducer (acc:number, out:MuWriteStream) {
        return acc + out.offset;
    }

    const sum = outs.reduce(reducer, 0);
    return sum / outs.length;
}
