import { useEffect, useState } from 'react'
import { CollectibleCard } from '../../components/CollectibleCard'
import { RAFFLE_ORDER } from '../../constants'
import { API_ORIGIN, api, formatApiError } from '../../api/client'
import { useI18n } from '../../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../../i18n/raffleLabels'
import { useAdmin } from '../AdminProvider'

export function NftUploadPage() {
  const { t } = useI18n()
  const { raffles, uploadCardImage, resetCardImage } = useAdmin()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Live check of the API the uploads go to: a dead backend is reported, never hidden. */
  const [server, setServer] = useState<{ ok: boolean; detail: string } | null>(null)
  /** Which custom images actually load from the server (a stored URL can still be unreachable). */
  const [broken, setBroken] = useState<Record<string, boolean>>({})

  const checkServer = () => {
    setServer(null)
    api
      .get('/health', { timeout: 10_000 })
      .then(() => setServer({ ok: true, detail: API_ORIGIN }))
      .catch((err) => setServer({ ok: false, detail: formatApiError(err) }))
  }
  useEffect(checkServer, [])

  useEffect(() => {
    for (const id of RAFFLE_ORDER) {
      const url = raffles[id].image
      if (!url) continue
      const img = new Image()
      img.onload = () => setBroken((b) => ({ ...b, [id]: false }))
      img.onerror = () => setBroken((b) => ({ ...b, [id]: true }))
      img.src = url
    }
  }, [raffles])

  const onFile = async (id: (typeof RAFFLE_ORDER)[number], file: File | undefined) => {
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      setError(t('adminNftTooLarge', { mb: (file.size / 1024 / 1024).toFixed(1) }))
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await uploadCardImage(id, file)
    } catch (err) {
      setError(err instanceof Error && err.message === 'nft_not_stored' ? t('adminNftNotStored') : formatApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('adminNftHint')}</p>
      <div className={`rounded-xl border px-3 py-2 text-[12px] ${server == null ? 'border-white/10 text-zinc-400' : server.ok ? 'border-emerald-400/40 text-emerald-300' : 'border-orange-400/50 text-orange-300'}`}>
        <p className="font-semibold">{server == null ? t('adminNftServerChecking') : server.ok ? t('adminNftServerOk') : t('adminNftServerDown')}</p>
        {server ? <p className="mt-0.5 break-all text-[11px] opacity-80">{server.detail}</p> : null}
        {server && !server.ok ? <p className="mt-1 text-[11px] text-zinc-400">{t('adminNftServerDownHint')}</p> : null}
        <button type="button" className="admin-btn mt-2" onClick={checkServer}>
          {t('adminNftServerRecheck')}
        </button>
      </div>
      {error ? <p className="text-sm text-orange-400 break-all">{error}</p> : null}
      {RAFFLE_ORDER.map((id) => (
        <section key={id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
          <h2 className="font-semibold text-zinc-100">{t(RAFFLE_TITLE_KEY[id])}</h2>
          <div className="mt-3">
            <CollectibleCard raffleId={id} compact />
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            {raffles[id].image ? (broken[id] ? t('adminNftCustomBroken') : t('adminNftCustom')) : t('adminNftDefault')}
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
