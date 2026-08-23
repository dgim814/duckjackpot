import { Link, useParams } from 'react-router-dom'
import { ScreenHeader } from '../components/ScreenHeader'
import { getLegalDoc, LEGAL_DOC_IDS, type LegalDocId } from '../legal/docs'
import { useI18n } from '../i18n/LanguageProvider'

function isDocId(value: string | undefined): value is LegalDocId {
  return LEGAL_DOC_IDS.includes(value as LegalDocId)
}

export function LegalDocPage() {
  const { t, lang } = useI18n()
  const { docId } = useParams()
  if (!isDocId(docId)) {
    return (
      <section className="px-4 pb-6">
        <ScreenHeader title={t('legalHubTitle')} />
        <p className="mt-4 text-sm text-zinc-400">{t('legalNotFound')}</p>
        <Link to="/terms" className="mt-3 inline-block text-sm font-semibold text-amber-300">
          {t('legalBack')}
        </Link>
      </section>
    )
  }

  const doc = getLegalDoc(lang, docId)

  return (
    <section className="px-4 pb-6">
      <ScreenHeader title={doc.title} />
      <Link to="/terms" className="mt-3 inline-block text-xs font-semibold text-amber-300">
        {t('legalBack')}
      </Link>
      <div className="mt-4 space-y-4 rounded-2xl border border-white/8 bg-[#141218] p-4 text-sm leading-relaxed text-zinc-300">
        <p>{doc.intro}</p>
        {doc.sections.map((section) => (
          <div key={section.heading}>
            <h2 className="font-display text-base font-bold text-amber-200">{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-2">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
