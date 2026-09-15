export const HUNT_WEAPONS = [
  { id: 'sling' as const, cooldown: 0.28, ammo: 3, radius: 0.5 },
  { id: 'blaster' as const, cooldown: 0.14, ammo: 3, radius: 0.56 },
  { id: 'thunder' as const, cooldown: 0.06, ammo: 4, radius: 0.6 },
]

export type HuntWeaponId = (typeof HUNT_WEAPONS)[number]['id']

export function huntWeapon(id: HuntWeaponId) {
  return HUNT_WEAPONS.find((item) => item.id === id) ?? HUNT_WEAPONS[1]
}
