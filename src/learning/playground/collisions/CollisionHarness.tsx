import CollisionInspect from './CollisionInspect'
import CollisionPlayground from './CollisionPlayground'
import type {BroadPhaseMethod} from './collisionProtocol'
import '../../ChapterPage.css'

/**
 * HARNESS ONLY: mounts the Run component and, below it, the Look underneath view so a browser smoke can test them before the
 * chapter integration (CP7).
 * Route: /bezeg-2.0/harness/collision-playground?count=300&method=sweep. Add &inspect=0 to hide the inspect view and
 * &inspectCount=30 to set its object count. Not linked from anywhere; remove with CP7 if unwanted.
 */
export function CollisionHarness() {
  const params = new URLSearchParams(window.location.search)
  const count = Number(params.get('count'))
  const inspectCount = Number(params.get('inspectCount'))
  const method: BroadPhaseMethod = params.get('method') === 'naive' ? 'naive' : 'sweep'
  return (
    <main className="chapter-page" style={{maxWidth: '60rem', margin: '0 auto'}}>
      <CollisionPlayground initialMethod={method} initialCount={Number.isFinite(count) && count > 0 ? count : 300}/>
      {params.get('inspect') !== '0' && (
        <CollisionInspect initialCount={Number.isFinite(inspectCount) && inspectCount > 0 ? inspectCount : undefined}/>
      )}
      <div style={{height: '150vh'}} aria-hidden="true"/>
    </main>
  )
}
