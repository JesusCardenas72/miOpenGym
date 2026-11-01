import { t } from '../lib/i18n.js'
import { minimumGaps } from '../lib/volume.js'

// What the running microcycle still lacks, under the bars on Home's volume card once every planned
// session is done or its scheduled workout days are over (MuscleVolumeCard). Each group's own line
// of the bars carries the sets it still needs (VolumeGroupBars, `minimum`); this is the summary.
// The counts are per group: a compound set also feeds the groups it trains alongside, so they are
// not added up.
export default function MinimumGaps({ vol, complete }) {
  const gaps = minimumGaps(vol).filter(g => g.min > 0)
  const short = gaps.filter(g => g.remaining > 0).length
  // Complete, the block says so; with its days over but sessions left, the days say so.
  const summary = short
    ? (complete ? t('Microcycle complete — sets still missing in {0} of {1} groups.', short, gaps.length)
      : t('Scheduled days are over — sets still missing in {0} of {1} groups.', short, gaps.length))
    : (complete ? t('Microcycle complete — every group reaches its minimum.')
      : t('Scheduled days are over — every group reaches its minimum.'))
  return <>
    <div className="vol-hd"><h4 className="sec">{t('To reach the minimum')}</h4></div>
    <div className="muted small">{summary}</div>
  </>
}
