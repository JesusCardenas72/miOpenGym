import { useEffect, useRef, useState } from 'react'
import { exOr } from '../lib/exercises.js'
import { exerciseNameFor, t } from '../lib/i18n.js'
import { dockItems, dropSlot } from '../lib/workout-dock.js'
import Icon from './Icon.jsx'
import { Thumb } from './Media.jsx'

// Press-and-hold before a thumbnail lifts, so the strip can still be flicked sideways with a
// finger, and a little slop so the hold survives a shaky thumb. Same feel as the plan editor's
// row dragging (ROUTINE_LONG_PRESS_MS / ROUTINE_DRAG_SLOP) — one gesture vocabulary for the app.
const DOCK_LONG_PRESS_MS = 380
const DOCK_DRAG_SLOP = 8
// How close to an edge the finger has to get before the strip scrolls itself along.
const DOCK_EDGE = 44
const DOCK_SCROLL_STEP = 12

/**
 * The strip of exercise thumbnails under the running session: where you are, what is done,
 * what is left, and the whole running order in one glance. Tap a thumbnail to jump to that
 * exercise; press and hold one to drag its display unit somewhere else in the session.
 *
 * A superset is one draggable unit — its thumbnails sit inside a coloured capsule and travel
 * together, so an order can never be produced that splits a pair (see lib/workout-dock.js for
 * the grouping and the colours, lib/active-workout-order.js for the reorder itself).
 */
export default function WorkoutDock({ entries, cur, onSelect, onReorder, onAdd, disabled }) {
  const stripRef = useRef(null)
  const gestureRef = useRef(null)
  const entriesRef = useRef(entries)
  const onReorderRef = useRef(onReorder)
  const suppressClick = useRef(false)
  const [drag, setDrag] = useState(null)
  entriesRef.current = entries
  onReorderRef.current = onReorder
  const items = dockItems(entries)

  useEffect(() => {
    const strip = stripRef.current
    if (!strip || disabled) return undefined
    let frame = null
    setDrag(current => (current ? null : current))

    const clearFrame = () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      frame = null
    }
    // The measured strip has to still describe the list we started from: an exercise finishing,
    // being added or being removed mid-drag invalidates every rect we are about to compare.
    const unitRects = () => {
      const units = [...strip.querySelectorAll('[data-dock-unit]')]
      if (units.length !== dockItems(entriesRef.current).length) return null
      return units.map(node => {
        const rect = node.getBoundingClientRect()
        return {
          position: Number(node.dataset.dockUnit),
          left: rect.left, right: rect.right, center: rect.left + rect.width / 2,
        }
      })
    }
    const finish = (gesture, commit) => {
      if (!gesture || gestureRef.current !== gesture) return
      window.clearTimeout(gesture.timer)
      clearFrame()
      gestureRef.current = null
      if (!gesture.active) return
      try { gesture.captureTarget?.releasePointerCapture?.(gesture.pointerId) } catch { /* already released */ }
      setDrag(null)
      // The compatibility click lands right after pointerup — a drop must not also count as a
      // tap on whatever thumbnail the finger happened to end over.
      suppressClick.current = true
      window.setTimeout(() => { suppressClick.current = false }, 150)
      if (commit && gesture.entries === entriesRef.current && gesture.slot !== gesture.source) {
        onReorderRef.current?.(gesture.index, gesture.slot)
      }
    }
    const update = (gesture, x, schedule = true) => {
      const rects = unitRects()
      const source = rects?.find(rect => rect.position === gesture.source)
      if (!source || gesture.entries !== entriesRef.current) { finish(gesture, false); return }
      const remaining = rects.filter(rect => rect.position !== gesture.source)
      gesture.lastX = x
      gesture.slot = dropSlot(remaining.map(rect => rect.center), x)
      const stripRect = strip.getBoundingClientRect()
      const marker = gesture.slot <= 0 ? (remaining[0]?.left ?? source.left)
        : gesture.slot >= remaining.length ? (remaining.at(-1)?.right ?? source.right)
          : (remaining[gesture.slot - 1].right + remaining[gesture.slot].left) / 2
      setDrag({
        position: gesture.source,
        deltaX: x - gesture.grabX,
        markerLeft: marker - stripRect.left + strip.scrollLeft,
      })
      if (schedule && frame == null) frame = window.requestAnimationFrame(autoScroll)
    }
    function autoScroll() {
      frame = null
      const gesture = gestureRef.current
      if (!gesture?.active) return
      const rect = strip.getBoundingClientRect()
      const max = strip.scrollWidth - strip.clientWidth
      let step = 0
      if (gesture.lastX < rect.left + DOCK_EDGE && strip.scrollLeft > 0) step = -DOCK_SCROLL_STEP
      else if (gesture.lastX > rect.right - DOCK_EDGE && strip.scrollLeft < max) step = DOCK_SCROLL_STEP
      if (!step) return
      strip.scrollLeft += step
      update(gesture, gesture.lastX, false)
      if (gestureRef.current === gesture) frame = window.requestAnimationFrame(autoScroll)
    }
    const lift = gesture => {
      if (gestureRef.current !== gesture || gesture.entries !== entriesRef.current) { finish(gesture, false); return }
      const rects = unitRects()
      if (!rects?.some(rect => rect.position === gesture.source)) { finish(gesture, false); return }
      gesture.active = true
      gesture.grabX = gesture.lastX
      gesture.captureTarget = gesture.downTarget
      try { gesture.captureTarget.setPointerCapture?.(gesture.pointerId) } catch { /* unsupported */ }
      suppressClick.current = true
      update(gesture, gesture.lastX)
    }
    const onPointerDown = event => {
      suppressClick.current = false
      const current = gestureRef.current
      if (current) { if (event.pointerId !== current.pointerId) finish(current, false); return }
      if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return
      const thumb = event.target.closest?.('[data-dock-index]')
      const unit = thumb?.closest('[data-dock-unit]')
      if (!thumb || !unit || !strip.contains(thumb)) return
      const index = Number(thumb.dataset.dockIndex)
      const source = Number(unit.dataset.dockUnit)
      if (!Number.isInteger(index) || !Number.isInteger(source)) return
      const gesture = {
        pointerId: event.pointerId, index, source, slot: source, downTarget: event.target,
        startX: event.clientX, startY: event.clientY, lastX: event.clientX,
        entries: entriesRef.current, active: false, timer: null,
      }
      gesture.timer = window.setTimeout(() => lift(gesture), DOCK_LONG_PRESS_MS)
      gestureRef.current = gesture
    }
    const onPointerMove = event => {
      const gesture = gestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return
      if (!gesture.active) {
        // Moved before the hold completed: that was a scroll of the strip, not a drag.
        if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > DOCK_DRAG_SLOP) {
          window.clearTimeout(gesture.timer)
          gestureRef.current = null
        } else gesture.lastX = event.clientX
        return
      }
      event.preventDefault()
      update(gesture, event.clientX)
    }
    const onPointerUp = event => {
      const gesture = gestureRef.current
      if (!gesture || event.pointerId !== gesture.pointerId) return
      if (gesture.active) event.preventDefault()
      finish(gesture, gesture.active)
    }
    const onPointerCancel = event => {
      const gesture = gestureRef.current
      if (gesture && event.pointerId === gesture.pointerId) finish(gesture, false)
    }
    const cancel = () => finish(gestureRef.current, false)
    const onKeyDown = event => {
      if (event.key !== 'Escape' || !gestureRef.current) return
      event.preventDefault(); cancel()
    }
    // Once a thumbnail is lifted the browser must not also claim the move as a sideways pan of
    // the strip — it would fire pointercancel and scroll instead. Only a non-passive touchmove
    // listener can stop that, and only while a drag is actually running.
    const onTouchMove = event => { if (gestureRef.current?.active) event.preventDefault() }
    const onContextMenu = event => { if (gestureRef.current?.active) event.preventDefault() }
    const onDragStart = event => { if (event.target.closest?.('[data-dock-index]')) event.preventDefault() }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('pointermove', onPointerMove, { passive: false })
    document.addEventListener('pointerup', onPointerUp, { passive: false })
    document.addEventListener('pointercancel', onPointerCancel)
    document.addEventListener('lostpointercapture', onPointerCancel)
    document.addEventListener('keydown', onKeyDown)
    strip.addEventListener('contextmenu', onContextMenu)
    strip.addEventListener('dragstart', onDragStart)
    window.addEventListener('blur', cancel)
    return () => {
      window.clearTimeout(gestureRef.current?.timer)
      clearFrame()
      gestureRef.current = null
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointercancel', onPointerCancel)
      document.removeEventListener('lostpointercapture', onPointerCancel)
      document.removeEventListener('keydown', onKeyDown)
      strip.removeEventListener('contextmenu', onContextMenu)
      strip.removeEventListener('dragstart', onDragStart)
      window.removeEventListener('blur', cancel)
    }
  }, [disabled, entries])

  if (!items.length) return null

  const onClickCapture = event => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault(); event.stopPropagation()
  }

  return <div className={'wdock' + (drag ? ' is-dragging' : '')} data-testid="workout-dock" onClickCapture={onClickCapture}>
    <div className="wdock-strip" ref={stripRef}>
      {items.map(item => {
        const lifted = drag?.position === item.position
        return <div key={item.position} data-dock-unit={item.position}
          className={'wdock-unit' + (item.sg ? ' ss' : '') + (lifted ? ' lifted' : '')}
          style={{
            ...(item.hue == null ? null : { '--ss-hue': item.hue }),
            ...(lifted ? { transform: 'translate3d(' + drag.deltaX + 'px,0,0)' } : null),
          }}>
          {item.indices.map(index => {
            const ex = exOr(entries[index].id)
            const name = exerciseNameFor(ex)
            return <button key={index} type="button" data-dock-index={index}
              className={'wdock-thumb' + (index === cur ? ' on' : '') + (item.done ? ' done' : '')}
              aria-label={name} aria-current={index === cur ? 'true' : undefined} title={name}
              onClick={() => onSelect(index)}>
              <Thumb ex={ex} />
              {item.done && <span className="wdock-check" aria-hidden="true"><Icon name="check" /></span>}
            </button>
          })}
        </div>
      })}
      <button type="button" className="wdock-add" aria-label={t('Add exercise')} title={t('Add exercise')}
        onClick={onAdd}><Icon name="plus" /></button>
      {drag && <div className="wdock-marker" data-testid="workout-dock-marker" aria-hidden="true"
        style={{ left: drag.markerLeft + 'px' }} />}
    </div>
  </div>
}
