import type { LotDraft } from '../catalog'

/**
 * RARE OBJECTS — DuckJackpot's own heist relics. These are FICTIONAL
 * collectibles (game lore, marked "fictional" and shown as "Легенда DuckJackpot"),
 * so nothing here is presented as a real historical object or auction record.
 * Prices are set directly (DUCK COIN) and skip the tier mapping.
 */
function R(
  id: string,
  ru: [string, string, string, string, string],
  en: [string, string, string, string, string],
  rarity: LotDraft['rarity'],
  price: number,
): LotDraft {
  return {
    id,
    name: { ru: ru[0], en: en[0] },
    maker: { ru: 'Легенда DuckJackpot', en: 'DuckJackpot lore' },
    artist: { ru: 'Легенда DuckJackpot', en: 'DuckJackpot lore' },
    year: { ru: ru[1], en: en[1] },
    blurb: { ru: ru[2], en: en[2] },
    fact: { ru: ru[3], en: en[3] },
    significance: { ru: ru[4], en: en[4] },
    rarity,
    category: 'SPECIAL',
    purchasePrice: price,
    collectionValue: Math.round(price * 1.15),
    fictional: true,
    fixedPrice: true,
  }
}

export const RARE_OBJECT_LOTS: LotDraft[] = [
  R(
    'rare_first_duckcoin',
    ['Первая DUCK COIN', 'из первого ограбления BANK', 'Самая первая монета, вынесенная из BANK.', 'По легенде игры её подняли в вестибюле BANK в первую же минуту.', 'Начало любой коллекции — первая монета.'],
    ['The first DUCK COIN', 'from the first BANK heist', 'The very first coin carried out of the BANK.', 'Game lore says it was picked up in the BANK lobby in the first minute.', 'Every collection starts with a first coin.'],
    'COMMON',
    120,
  ),
  R(
    'rare_vault_key',
    ['Ключ от хранилища BANK', 'вымышленный реквизит', 'Тяжёлый латунный ключ с номером хранилища.', 'В мире DuckJackpot такие ключи выдают только старшим кассирам.', 'Символ первого большого сейфа.'],
    ['BANK vault key', 'fictional prop', 'A heavy brass key stamped with a vault number.', 'In the DuckJackpot world only senior tellers carry these keys.', 'The symbol of your first big safe.'],
    'RARE',
    900,
  ),
  R(
    'rare_mansion_seal',
    ['Печать владельца MANSION', 'вымышленный реквизит', 'Сургучная печать с гербом особняка.', 'По легенде игры ею скрепляли письма о сделках в NFT Vault.', 'Трофей того, кто прошёл особняк до конца.'],
    ['MANSION owner’s seal', 'fictional prop', 'A wax seal with the mansion crest.', 'Game lore says it sealed the letters about NFT Vault deals.', 'A trophy for walking the mansion end to end.'],
    'RARE',
    1300,
  ),
  R(
    'rare_gold_bar',
    ['Слиток «Дак-Резерв»', 'вымышленный реквизит', 'Золотой слиток с клеймом утки.', 'В мире DuckJackpot такие слитки хранят в GRAND VAULT.', 'Чистый вес богатства — без подписи художника.'],
    ['“Duck Reserve” gold bar', 'fictional prop', 'A gold bar stamped with a duck.', 'In the DuckJackpot world these bars rest in the GRAND VAULT.', 'Pure weight of wealth — no artist’s signature needed.'],
    'EPIC',
    3600,
  ),
  R(
    'rare_laser_prism',
    ['Призма лазерного коридора', 'вымышленный реквизит', 'Кристалл, который когда-то держал красный луч.', 'По легенде игры это призма из первого лазерного зала GRAND COLLECTION.', 'Память о самом опасном коридоре.'],
    ['Laser corridor prism', 'fictional prop', 'A crystal that once held a red beam.', 'Game lore says it came from the first laser hall of the GRAND COLLECTION.', 'A keepsake from the most dangerous corridor.'],
    'EPIC',
    5200,
  ),
  R(
    'rare_black_ledger',
    ['Чёрная книга Black Market', 'вымышленный реквизит', 'Тетрадь с записями всех сделок подпольного рынка.', 'В мире DuckJackpot её ищут все скупщики.', 'Кто владеет книгой — тот знает цену всему.'],
    ['The Black Market ledger', 'fictional prop', 'A notebook of every deal of the underground market.', 'In the DuckJackpot world every fence is looking for it.', 'Whoever holds the ledger knows the price of everything.'],
    'LEGENDARY',
    12000,
  ),
  R(
    'rare_skyline_crown',
    ['Корона SKYLINE', 'вымышленный реквизит', 'Корона с крыши небоскрёба SKYLINE TOWER.', 'По легенде игры её хранили в сейфе на самой крыше.', 'Высота, до которой добираются немногие.'],
    ['The SKYLINE crown', 'fictional prop', 'A crown from the roof of SKYLINE TOWER.', 'Game lore says it was kept in the rooftop safe.', 'A height few thieves ever reach.'],
    'LEGENDARY',
    20000,
  ),
  R(
    'rare_grand_vault_key',
    ['Ключ Гранд-хранилища', 'вымышленный реквизит', 'Единственный ключ от сердца DuckJackpot Grand Vault.', 'В мире DuckJackpot он открывает последнюю дверь всей игры.', 'Финальный трофей коллекционера-вора.'],
    ['The Grand Vault key', 'fictional prop', 'The only key to the heart of the DuckJackpot Grand Vault.', 'In the DuckJackpot world it opens the last door of the whole game.', 'The final trophy of a collector-thief.'],
    'ICONIC',
    90000,
  ),
]
