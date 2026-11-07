// Bench page: owns a real module Worker (benchWorker.ts) and exposes window.bench. No app route.
// `main` runs the same code on the page's main thread: CDP CPU throttling does not reach workers.
import {handleBench} from './shared'
import type {BenchRequest, BenchResponse} from './shared'

const worker = new Worker(new URL('./benchWorker.ts', import.meta.url), {type: 'module'})

function request(message: BenchRequest): Promise<BenchResponse> {
    return new Promise(resolve => {
        worker.onmessage = (event: MessageEvent<BenchResponse>) => resolve(event.data)
        worker.postMessage(message)
    })
}

;(window as unknown as {bench: unknown}).bench = {
    ready: true,
    send: (message: BenchRequest, where: 'worker' | 'main') => (where === 'main' ? Promise.resolve(handleBench(message)) : request(message)),
}
