// Benchmark worker entry: runs the shared measurement inside a real module Worker.
import {handleBench} from './shared'
import type {BenchRequest} from './shared'

self.onmessage = (event: MessageEvent<BenchRequest>) => self.postMessage(handleBench(event.data))
