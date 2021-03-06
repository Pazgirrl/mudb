# muworker-socket
[Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API#Web_Workers_concepts_and_usage) made available to `mudb`.  Suitable for creating games with a single-player mode by running the server in a separate thread to allow better user experience.

# example
Both `browserify` and `webworkify` are required to run the example.

**worker.js**
```js
const { createWorkerSocketServer } = require('muworker-socket/server')
const { MuServer } = require('mudb/server')

// source of worker should go into `module.exports`
module.exports = () => {
    const socketServer = createWorkerSocketServer()
    const muServer = new MuServer(socketServer)

    socketServer.listen()
    muServer.start(/* listeners */)
}
```

**client.js**
```js
// `webworkify` enables workers to `require()`
const work = require('webworkify')
const { createWorkerSocket } = require('muworker-socket/socket')
const { MuClient } = require('mudb/client')

const serverWorker = work(require('./worker.js'))
const socket = createWorkerSocket({
    sessionId: Math.random().toString(36).substr(2),
    serverWorker: serverWorker,
})
const muClient = new MuClient(socket)

muClient.start(/* listeners */)
```

# table of contents

# install #

```
npm i muworker-socket
```

# api #

## interfaces ##

Purely instructive types used to describe the API:
* `SessionId`: `string`

## `createWorkerSocketServer()` ##
A factory returning a new instance of `MuWorkerSocketServer`.

## `createWorkerSocket(spec)` ##
A factory returning a new instance of `MuWorkerSocket`.

* `spec:object`
    * `sessionId:SessionId`: a unique session id used to identify a client
    * `serverWorker:Worker`: the worker in which the server is running

## `MuWorkerSocketServer` ##
A `MuWorkerSocketServer` is a pseudo socket server that can be used to instantiate a `MuServer`.

### `listen()` ###
Starts the socket server listening for connections.

## `MuWorkerSocket` ##
A `MuLocalSocket` is a pseudo client-side socket that can be used to instantiate a `MuClient`.

## credits
Copyright (c) 2018 He Diyi, Shenzhen Dianmao Technology Company Limited
