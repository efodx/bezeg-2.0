import CollisionPlayground from './CollisionPlayground'
import type {BroadPhaseMethod} from './collisionProtocol'
import '../../ChapterPage.css'

/**
 * HARNESS ONLY: mounts the Run component alone so a browser smoke can test it before the chapter integration (CP7).
 * Route: /bezeg-2.0/harness/collision-playground?count=300&method=sweep. Not linked from anywhere; remove with CP7 if unwanted.
 */
export function CollisionHarness() {
  const params = new URLSearchParams(window.location.search)
  const count = Number(params.get('count'))
  const method: BroadPhaseMethod = params.get('method') === 'naive' ? 'naive' : 'sweep'
  return (
    <main className="chapter-page" style={{maxWidth: '60rem', margin: '0 auto'}}>
      <CollisionPlayground initialMethod={method} initialCount={Number.isFinite(count) && count > 0 ? count : 300}/>
      <div style={{height: '150vh'}} aria-hidden="true"/>
    </main>
  )
}
