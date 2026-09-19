import type { ItemCategory, ItemRarity, LotDraft } from '../catalog'

export function C(
  id: string,
  nameRu: string,
  nameEn: string,
  makerRu: string,
  makerEn: string,
  yearRu: string,
  yearEn: string,
  blurbRu: string,
  blurbEn: string,
  factRu: string,
  factEn: string,
  whyRu: string,
  whyEn: string,
  rarity: ItemRarity,
  category: ItemCategory,
  price: number,
  value: number,
  extra?: {
    limited?: number
    image?: string
    engineRu?: string
    engineEn?: string
    market?: boolean
  },
): LotDraft {
  return {
    id,
    name: { ru: nameRu, en: nameEn },
    maker: { ru: makerRu, en: makerEn },
    artist: { ru: makerRu, en: makerEn },
    year: { ru: yearRu, en: yearEn },
    blurb: { ru: blurbRu, en: blurbEn },
    fact: { ru: factRu, en: factEn },
    significance: { ru: whyRu, en: whyEn },
    rarity,
    category,
    purchasePrice: price,
    collectionValue: value,
    limited: extra?.limited,
    image: extra?.image,
    engine: extra?.engineRu && extra.engineEn ? { ru: extra.engineRu, en: extra.engineEn } : undefined,
    market: extra?.market !== false,
  }
}
