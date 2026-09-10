import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { VOLUME_GROUPS, VOLUME_TARGET, volumeStatus, volumeColor } from '../lib/volume.js'

// Effective sets per muscle group for one microcycle, read against the 10–20 target band.
// Shared by Home and Stats so the two can never report different numbers for the same block.
//
// The bar is measured against the top of the band, not against the best-worked group: full
// width is 20 sets, so a short bar means "short of the target", not "trained less than legs".
export default function VolumeGroupBars({ vol, title }) {
  if (!vol) return null
  return <>
    {title !== false && <h4 className="sec" style={{ marginTop: 14 }}>{title || t('Effective sets')}</h4>}
    <div className="muted small" style={{ marginBottom: 6 }}>
      {t('Target {0}–{1} effective sets per muscle group each microcycle', VOLUME_TARGET.min, VOLUME_TARGET.max)}
    </div>
    {VOLUME_GROUPS.map(g => {
      const v = Math.round((vol.groups[g.key] || 0) * 10) / 10
      const color = volumeColor(volumeStatus(v))
      return <div key={g.key} className="mrow">
        <span className="nm">{t(g.name)}</span>
        <span className="bar"><i style={{ width: Math.min(100, Math.round(v / VOLUME_TARGET.max * 100)) + '%', background: color }} /></span>
        <span className="v" style={{ color }}>{t('{0} sets', fmtNum(v))}</span>
      </div>
    })}
    <div className="vol-legend">
      <span><i style={{ background: 'var(--orange)' }} />{t('under')} {VOLUME_TARGET.min}</span>
      <span><i style={{ background: 'var(--green)' }} />{t('in range')} {VOLUME_TARGET.min}–{VOLUME_TARGET.max}</span>
      <span><i style={{ background: 'var(--red)' }} />{t('over')} {VOLUME_TARGET.max}</span>
    </div>
    {vol.unrated > 0 && <div className="small" style={{ color: 'var(--yellow)', marginTop: 8 }}>
      {t('{0} of {1} sets without RIR — counted as effective', vol.unrated, vol.total)}
    </div>}
  </>
}
