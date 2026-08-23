import { useAdmin } from '../AdminProvider'
import { RAFFLE_ORDER } from '../../constants'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'

export function NftUploadPage() {
  const { t } = useI18n()
  const { raffles, cardArt, setCardImage } = useAdmin()

  const onFile = (id: (typeof RAFFLE_ORDER)[number], file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setCardImage(id, reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('adminNftHint')}</p>
      {RAFFLE_ORDER.map((id) => (
        <section key={id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
          <h2 className="font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[id])}</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
            <img src={cardArt(id)} alt="" className="aspect-[4/5] w-full object-cover" />
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            {raffles[id].image ? t('adminNftCustom') : t('adminNftDefault')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="admin-btn cursor-pointer">
              {t('adminNftUpload')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(id, e.target.files?.[0])}
              />
            </label>
            {raffles[id].image ? (
              <button type="button" className="admin-btn" onClick={() => setCardImage(id, null)}>
                {t('adminNftReset')}
              </button>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}
