import {createWorkerLoop} from './collisionLoop'
import type {CollisionCommand} from './collisionProtocol'

// The thin worker host: it wires the worker globals to the pure loop, which collisionLoop.test.ts covers.
const loop = createWorkerLoop(
  (event, transfer) => self.postMessage(event, {transfer}),
  (fn, delayMs) => {
    const handle = setTimeout(fn, delayMs)
    return () => clearTimeout(handle)
  },
)

self.onmessage = (event: MessageEvent<CollisionCommand>) => loop.handle(event.data)
