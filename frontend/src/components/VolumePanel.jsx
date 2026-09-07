import LineChart from './LineChart.jsx'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import {
  VOLUME_GROUPS, VOLUME_TARGET, microcycleLength, microcycleVolume, microcycleSeries,
  volumeStatus, volumeColor,
} from '../lib/volume.js'

// Effective-set volume over the current microcycle (last N sessions, not the calendar week),
// one small trend line per muscle group with the target band shown as colour: under 10 sets is
// orange, 10–20 green, over 20 red. See lib/volume.js for the counting rules.
export default function VolumePanel({ S }) {
  const len = microcycleLength(S)
  const cur = microcycleVolume(S.workouts, len)
  // Nothing logged yet — the panel would be all zeros, so invite the first session instead.
  if (!cur.sessions) return null
  const series = microcycleSeries(S.workouts, len, 8)

  return <div className="card">
    <div className="row between" style={{ marginBottom: 2 }}>
      <h2 style={{ margin: 0 }}>{t('Effective sets')}</h2>
      <span className="small muted">{t('Last {0} sessions', cur.sessions)}</span>
    </div>
    <div className="muted small" style={{ marginBottom: 10 }}>{t('effective sets per muscle group')}</div>

    <div className="vol-grid">
      {VOLUME_GROUPS.map(g => {
        const v = cur.groups[g.key] || 0
        const color = volumeColor(volumeStatus(v))
        const points = series.map(b => ({ t: b.t, y: Math.round((b.groups[g.key] || 0) * 10) / 10 }))
        return <div key={g.key} className="vol-cell">
          <div className="top">
            <span className="nm">{t(g.name)}</span>
            <span className="val" style={{ color }}>{fmtNum(Math.round(v * 10) / 10)}</span>
          </div>
          <div className="vol-spark"><LineChart points={points} h={38} axes={false} color={color} /></div>
        </div>
      })}
    </div>

    <div className="vol-legend">
      <span><i style={{ background: 'var(--orange)' }} />{t('under')} {VOLUME_TARGET.min}</span>
      <span><i style={{ background: 'var(--green)' }} />{t('in range')} {VOLUME_TARGET.min}–{VOLUME_TARGET.max}</span>
      <span><i style={{ background: 'var(--red)' }} />{t('over')} {VOLUME_TARGET.max}</span>
    </div>

    {cur.unrated > 0 && <div className="small" style={{ color: 'var(--yellow)', marginTop: 8 }}>
      {t('{0} of {1} sets without RIR — counted as effective', cur.unrated, cur.total)}
    </div>}
  </div>
}
