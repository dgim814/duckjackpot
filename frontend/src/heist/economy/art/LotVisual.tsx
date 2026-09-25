import { useId } from 'react'
import { CarArt } from './car'
import { JewelArt } from './jewel'
import { ObjectArt } from './objects'
import { PaintingArt } from './painting'
import type { G } from './scene'
import type { Visual } from './visuals'
import { WatchArt } from './watch'

/** Renders one lot's own illustration recipe (see visuals.ts). */
export function LotVisual({ v }: { v: Visual }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const g: G = (key) => `lv${uid}${key}`
  switch (v.k) {
    case 'watch':
      return <WatchArt v={v} g={g} />
    case 'jewel':
      return <JewelArt v={v} g={g} />
    case 'paint':
      return <PaintingArt v={v} g={g} />
    case 'car':
      return <CarArt v={v} g={g} />
    case 'obj':
      return <ObjectArt v={v} g={g} />
  }
}
