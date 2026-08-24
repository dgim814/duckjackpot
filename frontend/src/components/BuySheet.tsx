import { useTonConnectUI, useTonWallet, type ConnectedWallet } from '@tonconnect/ui-react'
import { CheckCircle2, Coins, Copy, Wallet, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../admin/AdminProvider'
import { formatSerial, formatUsdtExact, useCards, type OwnedCard, type PayAsset } from '../cards/CardsProvider'
import { formatCardPrice, useUsdtRate } from '../hooks/useUsdtRate'
import { DEFAULT_TON_WALLET, DEFAULT_USDT_TRC20, getRaffle, walletOrDefault } from '../constants'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'
import { RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'
import { hasCompletedPreAml } from '../legal/preAml'
import {
  buildTonTransaction,
  estimateTonAmount,
  estimateUsdtAmount,
  fetchTonRubRate,
  paymentComment,
  waitForTonTransaction,
} from '../ton/pay'
import { waitForTrc20Usdt } from '../tron/trc20'

type Step = 'choose' | 'trc20' | 'success'

type BuySheetProps = {
  open: boolean
  onClose: () => void
}

function waitForWallet(
  tonConnectUI: { onStatusChange: (cb: (wallet: ConnectedWallet | null) => void) => () => void },
) {
  return new Promise<ConnectedWallet>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe()
      reject(new Error('wallet'))
    }, 120_000)
    const unsubscribe = tonConnectUI.onStatusChange((next) => {
      if (!next) return
      window.clearTimeout(timeout)
      unsubscribe()
      resolve(next)
    })
  })
}

function payErrorMessage(code: string, t: (key: MessageKey) => string) {
  if (code === 'stopped') return t('payPaused')
  if (code === 'sold_out') return t('paySoldOut')
  if (code === 'no_merchant') return t('payNoMerchant')
  if (code === 'no_usdt') return t('payUsdtUnavailable')
  if (code === 'wallet') return t('payWalletRequired')
  if (code === 'ton_rate' || code === 'usdt_rate') return t('payRateError')
  if (code === 'trc20_timeout') return t('payTrc20Timeout')
  if (/reject|cancel|abort/i.test(code)) return t('payCancelled')
  return t('payFailed')
}

export function BuySheet({ open, onClose }: BuySheetProps) {
  const { t, lang } = useI18n()
  const { mintCard, createPendingUsdt, confirmCardPayment, raffleId, remaining } = useCards()
  const { testPayMode, merchantWallet, usdtTrc20Address } = useAdmin()
  const raffle = getRaffle(raffleId)
  const payTonWallet = walletOrDefault(merchantWallet, DEFAULT_TON_WALLET)
  const payUsdtWallet = walletOrDefault(usdtTrc20Address, DEFAULT_USDT_TRC20)
  const { rate } = useUsdtRate()
  const navigate = useNavigate()
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<Step>('choose')
  const [bought, setBought] = useState<OwnedCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tonRub, setTonRub] = useState<number | null>(null)
  const [copied, setCopied] = useState<'address' | 'code' | null>(null)
  const [pendingCard, setPendingCard] = useState<OwnedCard | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const preAmlOk = hasCompletedPreAml()
  const payUsdtReady = payUsdtWallet.length > 0

  const tonAmount = tonRub ? estimateTonAmount(raffle.priceRub, tonRub) : null
  const usdtAmount = estimateUsdtAmount(raffle.priceRub, rate)

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      abortRef.current = null
      setBusy(false)
      setStep('choose')
      setBought(null)
      setError(null)
      setCopied(null)
      setPendingCard(null)
      return
    }
    console.log('[DuckJackpot] USDT TRC-20 address:', payUsdtWallet)
    console.log('[DuckJackpot] USDT TRC-20 source:', {
      settings: usdtTrc20Address,
      used: payUsdtWallet,
      fallback: DEFAULT_USDT_TRC20,
    })
    if (hasCompletedPreAml()) {
      try {
        tonConnectUI.closeModal()
      } catch {
        /* ignore */
      }
      try {
        const card = createPendingUsdt(usdtAmount)
        setPendingCard(card)
        setError(null)
        setCopied(null)
        setStep('trc20')
      } catch (err) {
        const code = err instanceof Error ? err.message : String(err)
        setError(payErrorMessage(code, t))
        setStep('choose')
      }
    }
    let cancelled = false
    void fetchTonRubRate()
      .then((value) => {
        if (!cancelled) setTonRub(value)
      })
      .catch(() => {
        if (!cancelled) setTonRub(null)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  const ensureWallet = async () => {
    if (wallet) return wallet
    await tonConnectUI.openModal()
    return waitForWallet(tonConnectUI)
  }

  const finishMint = (asset: PayAsset, txHash?: string) => {
    const card = mintCard(asset, { txHash })
    setBought(card)
    setStep('success')
  }

  const payTon = async () => {
    if (busy) return
    if (!preAmlOk) {
      setError(t('payNeedPreAml'))
      return
    }
    setError(null)
    setBusy(true)

    try {
      if (testPayMode) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        finishMint('TON')
        return
      }

      if (!payTonWallet) throw new Error('no_merchant')
      if (!tonAmount) throw new Error('ton_rate')

      const connected = await ensureWallet()
      const comment = paymentComment(raffleId, connected.account.address.slice(-6))
      const tx = buildTonTransaction({
        merchant: payTonWallet,
        tonAmount,
        comment,
      })
      const bocRaw = await tonConnectUI.sendTransaction(tx)
      const boc = typeof bocRaw === 'string' ? bocRaw : bocRaw.boc
      const txHash = await waitForTonTransaction(boc)
      finishMint('TON', txHash)
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err)
      setError(payErrorMessage(code, t))
    } finally {
      setBusy(false)
    }
  }

  const openUsdt = () => {
    if (busy) return
    if (!preAmlOk) {
      setError(t('payNeedPreAml'))
      return
    }
    if (!payUsdtWallet) {
      setError(t('payUsdtUnavailable'))
      return
    }
    try {
      tonConnectUI.closeModal()
    } catch {
      /* ignore */
    }
    console.log('[DuckJackpot] USDT TRC-20 address:', payUsdtWallet)
    try {
      const card = createPendingUsdt(usdtAmount)
      setPendingCard(card)
      setError(null)
      setCopied(null)
      setStep('trc20')
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err)
      setError(payErrorMessage(code, t))
    }
  }

  const confirmUsdt = async () => {
    if (busy || !payUsdtWallet || !pendingCard) return
    setError(null)
    setBusy(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (testPayMode) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        const card = confirmCardPayment(pendingCard.id)
        setBought(card)
        setStep('success')
        return
      }
      const expected = pendingCard.usdtExact ?? usdtAmount
      const txHash = await waitForTrc20Usdt({
        to: payUsdtWallet,
        amount: expected,
        sinceMs: pendingCard.purchasedAt,
        signal: controller.signal,
      })
      const card = confirmCardPayment(pendingCard.id, { txHash })
      setBought(card)
      setStep('success')
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err)
      setError(payErrorMessage(code, t))
    } finally {
      setBusy(false)
    }
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(payUsdtWallet)
      setCopied('address')
    } catch {
      setCopied(null)
    }
  }

  const copyPayCode = async () => {
    if (!pendingCard) return
    try {
      await navigator.clipboard.writeText(pendingCard.payCode)
      setCopied('code')
    } catch {
      setCopied(null)
    }
  }

  const goToCards = () => {
    onClose()
    navigate('/cards')
  }

  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const tonLabel = tonAmount
    ? `${tonAmount.toLocaleString(locale, { maximumFractionDigits: 4 })} TON / GRAM`
    : t('payRateLoading')
  const usdtLabel = `${usdtAmount.toLocaleString(locale, { maximumFractionDigits: 2 })} USDT · TRC-20`
  const exactUsdt = pendingCard?.usdtExact
  const exactUsdtLabel =
    typeof exactUsdt === 'number' ? formatUsdtExact(exactUsdt, locale) : usdtLabel

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t('close')}
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-amber-400/25 bg-[#141218] p-5 shadow-2xl">
        {step === 'success' && bought ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto text-amber-300" size={40} />
            <p className="mt-3 font-display text-xl font-bold text-amber-200">{t('paySuccessTitle')}</p>
            <p className="mt-2 text-sm text-zinc-300">
              {t('paySuccessBody', {
                serial: formatSerial(bought.serial, raffle.total),
                raffle: t(RAFFLE_TITLE_KEY[bought.raffleId]),
              })}
            </p>
            <p className="mt-3 font-mono text-lg font-extrabold tracking-wide text-amber-200">{bought.payCode}</p>
            <p className="mt-1 text-xs text-zinc-500">{t('cardStatusActive')}</p>
            {bought.txHash ? (
              <p className="mt-2 break-all text-[11px] text-zinc-500">
                {t('payTx')}: {bought.txHash}
              </p>
            ) : null}
            <button
              type="button"
              onClick={goToCards}
              className="buy-btn mt-5 w-full rounded-2xl px-4 py-3 font-display text-sm font-extrabold text-zinc-950"
            >
              {t('payGoToCards')}
            </button>
            <button type="button" onClick={onClose} className="mt-3 text-xs font-semibold text-zinc-500">
              {t('close')}
            </button>
          </div>
        ) : step === 'trc20' ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] text-orange-400">USDT · TRC-20</p>
                <h2 className="font-display mt-1 text-xl font-bold text-amber-200">{t('payUsdtTitle')}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort()
                  setBusy(false)
                  setStep('choose')
                  setError(null)
                }}
                className="rounded-full bg-white/5 p-2 text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t('payUsdtHint')}</p>
            <div className="mt-4 rounded-2xl border-2 border-amber-400 bg-amber-400/15 p-4 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-400">
                {t('payAmountLabel')}
              </p>
              <p className="mt-1 font-display text-3xl font-black tabular-nums text-amber-100">{exactUsdtLabel}</p>
              <p className="mt-1 text-[11px] text-amber-100/70">{t('payExactAmountHint')}</p>
            </div>
            <div className="mt-3 rounded-2xl border border-amber-400/20 bg-black/30 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                {t('adminMerchantUsdt')}
              </p>
              <p className="mt-2 break-all font-mono text-sm text-amber-100">{payUsdtWallet}</p>
            </div>
            {pendingCard ? (
              <div className="mt-3 rounded-2xl border border-amber-400/30 bg-black/30 px-4 py-4 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">
                  {t('cardPayCode')}
                </p>
                <p className="mt-2 font-mono text-2xl font-black tracking-wide text-amber-200">{pendingCard.payCode}</p>
                <p className="mt-2 text-sm font-semibold leading-snug text-zinc-300">
                  {t('payMemoTitle', { code: pendingCard.payCode })}
                </p>
              </div>
            ) : null}
            <p className="mt-4 rounded-2xl border-2 border-orange-400/50 bg-orange-500/15 px-4 py-4 text-center font-display text-base font-extrabold leading-snug text-amber-50">
              {t('payMemoFallback')}
            </p>
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-200"
            >
              <Copy size={16} />
              {copied === 'address' ? t('payCopied') : t('payCopyAddress')}
            </button>
            <button
              type="button"
              disabled={!pendingCard}
              onClick={() => void copyPayCode()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/50 bg-amber-400/20 px-4 py-3 text-sm font-extrabold text-amber-100 disabled:opacity-50"
            >
              <Copy size={16} />
              {copied === 'code' ? t('payCopied') : t('payCopyCode')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmUsdt()}
              className="buy-btn mt-3 w-full rounded-2xl px-4 py-3 font-display text-sm font-extrabold text-zinc-950 disabled:opacity-60"
            >
              {busy ? t('payProcessingUsdt') : t('payIPaid')}
            </button>
            <p className="mt-2 text-center text-[11px] text-zinc-500">{t('payUsdtCheckHint')}</p>
            {error ? <p className="mt-3 text-center text-sm text-orange-400">{error}</p> : null}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] text-orange-400">
                  {testPayMode ? t('testMode') : t('livePayMode')}
                </p>
                <h2 className="font-display mt-1 text-xl font-bold text-amber-200">{t('payTitle')}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {t(RAFFLE_TITLE_KEY[raffleId])} · {formatCardPrice(raffle.priceRub, rate, lang)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {testPayMode ? t('payHintTest') : t('payHintLive')}
                </p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full bg-white/5 p-2 text-zinc-400">
                <X size={18} />
              </button>
            </div>

            {!preAmlOk ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                <p>{t('payNeedPreAml')}</p>
                <Link
                  to="/legal/pre-aml"
                  onClick={onClose}
                  className="mt-2 inline-block font-semibold text-amber-300"
                >
                  {t('preAmlOpen')}
                </Link>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <button
                type="button"
                disabled={busy || remaining <= 0 || !preAmlOk || !payUsdtReady}
                onClick={openUsdt}
                className="w-full rounded-2xl border-2 border-amber-400/40 bg-amber-400/10 px-3 py-4 text-left disabled:opacity-50"
              >
                <p className="text-[10px] font-extrabold tracking-[0.16em] text-orange-400">{t('payPrimary')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Coins className="text-orange-400" size={20} />
                  <p className="font-display text-base font-bold text-amber-100">USDT TRC-20</p>
                </div>
                <p className="mt-1 text-xs text-zinc-300">{testPayMode ? raffle.testUsdt : usdtLabel}</p>
              </button>
              <button
                type="button"
                disabled={busy || remaining <= 0 || !preAmlOk}
                onClick={() => void payTon()}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-left disabled:opacity-60"
              >
                <p className="text-[10px] font-semibold tracking-[0.14em] text-zinc-500">{t('payTonExtra')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Wallet className="text-amber-300" size={18} />
                  <p className="font-display text-sm font-bold text-amber-100">TON / GRAM</p>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{testPayMode ? raffle.testTon : tonLabel}</p>
              </button>
            </div>

            {busy ? (
              <p className="mt-4 text-center text-sm font-semibold text-amber-200">{t('payProcessing')}</p>
            ) : null}
            {error ? <p className="mt-4 text-center text-sm text-orange-400">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  )
}
