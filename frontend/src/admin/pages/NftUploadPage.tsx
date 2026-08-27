import { useState } from 'react'
import { CollectibleCard } from '../../components/CollectibleCard'
import { RAFFLE_ORDER } from '../../constants'
import { formatApiError } from '../../api/client'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'
import { useAdmin } from '../AdminProvider'

export function NftUploadPage() {
  const { t } = useI18n()
  const { raffles, uploadCardImage, resetCardImage } = useAdmin()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (id: (typeof RAFFLE_ORDER)[number], file: File | undefined) => {
    if (!file) return
    setBusyId(id)
    setError(null)
    try {
      await uploadCardImage(id, file)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('adminNftHint')}</p>
      {error ? <p className="text-sm text-orange-400 break-all">{error}</p> : null}
      {RAFFLE_ORDER.map((id) => (
        <section key={id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
          <h2 className="font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[id])}</h2>
          <div className="mt-3">
            <CollectibleCard raffleId={id} compact />
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            {raffles[id].image ? t('adminNftCustom') : t('adminNftDefault')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="admin-btn cursor-pointer">
              {busyId === id ? '…' : t('adminNftUpload')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={busyId === id}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  void onFile(id, file)
                }}
              />
            </label>
            {raffles[id].image ? (
              <button
                type="button"
                className="admin-btn"
                disabled={busyId === id}
                onClick={() => {
                  setBusyId(id)
                  setError(null)
                  void resetCardImage(id)
                    .catch((err) => setError(formatApiError(err)))
                    .finally(() => setBusyId(null))
                }}
              >
                {t('adminNftReset')}
              </button>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}
