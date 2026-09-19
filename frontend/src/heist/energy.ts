export const ENERGY_MAX = 5

/** Raids do not spend energy yet, so the hub always shows a full reserve. */
export function currentEnergy() {
  return ENERGY_MAX
}
