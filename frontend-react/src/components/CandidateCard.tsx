import type { BTRCandidate } from '../types';
import './CandidateCard.css';

interface CandidateCardProps {
  candidate: BTRCandidate;
  index: number;
  isBest?: boolean;
}

function degToSign(deg: number): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(deg / 30) % 12;
  const degreesInSign = deg % 30;
  return `${signs[signIndex]} ${degreesInSign.toFixed(2)}°`;
}

export function CandidateCard({ candidate, index, isBest = false }: CandidateCardProps) {
  const time = new Date(candidate.time_local);
  const timeStr = time.toLocaleString();

  return (
    <div className="candidate-card">
      <div className="candidate-header">
        <strong>Candidate #{index + 1}</strong>
        {isBest && <span className="best-badge">Best</span>}
      </div>
      <div className="candidate-details">
        <div className="detail-row">
          <span className="label">Time (Local):</span>
          <span className="value">{timeStr}</span>
        </div>
        <div className="detail-row">
          <span className="label">Lagna:</span>
          <span className="value">{degToSign(candidate.lagna_deg)}</span>
        </div>
        <div className="detail-row">
          <span className="label">Pranapada (Sphuta):</span>
          <span className="value">{degToSign(candidate.pranapada_deg)}</span>
        </div>
        <div className="detail-row">
          <span className="label">Delta PP:</span>
          <span className={`value ${candidate.delta_pp_deg <= 2 ? 'pass' : 'fail'}`}>
            {candidate.delta_pp_deg.toFixed(2)}°
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Passes Trine Rule (BPHS 4.10):</span>
          <span className={`value ${candidate.passes_trine_rule ? 'pass' : 'fail'}`}>
            {candidate.passes_trine_rule ? '✓ Yes (Human Birth)' : '✗ No (Rejected)'}
          </span>
        </div>
        {candidate.passes_trine_rule && (
          <div className="bphs-explanation">
            <p className="explanation-text">
              <strong>BPHS 4.10 Verification:</strong> This time passes the Trine Rule because the birth lagna 
              is in a trine position (1st, 5th, or 9th) from Pranapada's rashi, confirming human birth per 
              Brihat Parashara Hora Shastra.
            </p>
          </div>
        )}
        {candidate.composite_score !== null && candidate.composite_score !== undefined && (
          <div className="detail-row highlight">
            <span className="label">Composite Score:</span>
            <span className="value">{candidate.composite_score.toFixed(2)}/100</span>
          </div>
        )}
        {candidate.verification_scores && (
          <div className="scores-section">
            <h4>BPHS Verification Scores</h4>
            <div className="scores-grid">
              <div className="score-item">
                <span className="score-label">Degree Match (BPHS 4.6):</span>
                <span className="score-value">{candidate.verification_scores.degree_match.toFixed(1)}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Gulika Alignment:</span>
                <span className="score-value">{candidate.verification_scores.gulika_alignment.toFixed(1)}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Moon Alignment:</span>
                <span className="score-value">{candidate.verification_scores.moon_alignment.toFixed(1)}</span>
              </div>
              <div className="score-item highlight">
                <span className="score-label">Combined Verification (BPHS 4.8):</span>
                <span className="score-value">{candidate.verification_scores.combined_verification.toFixed(1)}</span>
              </div>
            </div>
            <div className="bphs-explanation">
              <p className="explanation-text">
                <strong>BPHS 4.6 (Degree Matching):</strong> Lagna degrees and Pranapada degrees should be equal 
                (पदैक्यता). Difference: {candidate.delta_pp_deg.toFixed(2)}° - {
                  candidate.delta_pp_deg <= 2 ? 'Within acceptable tolerance (±2°)' : 'Outside tolerance, but verified by other methods'
                }.
              </p>
              <p className="explanation-text">
                <strong>BPHS 4.8 (Triple Verification):</strong> Birth lagna must be verified by at least one of: 
                Pranapada, Gulika, or Moon (विना प्राणपदाच्छुद्धो गुलिकाद्वा निशाकराद्). 
                Best verification score: {candidate.verification_scores.combined_verification.toFixed(1)}/100.
              </p>
            </div>
          </div>
        )}
        {candidate.physical_traits_scores && (
          <div className="scores-section">
            <h4>Physical Traits Scores</h4>
            <div className="scores-grid">
              {candidate.physical_traits_scores.height !== null && candidate.physical_traits_scores.height !== undefined && (
                <div className="score-item">
                  <span className="score-label">Height:</span>
                  <span className="score-value">{candidate.physical_traits_scores.height.toFixed(1)}</span>
                </div>
              )}
              {candidate.physical_traits_scores.build !== null && candidate.physical_traits_scores.build !== undefined && (
                <div className="score-item">
                  <span className="score-label">Build:</span>
                  <span className="score-value">{candidate.physical_traits_scores.build.toFixed(1)}</span>
                </div>
              )}
              {candidate.physical_traits_scores.complexion !== null && candidate.physical_traits_scores.complexion !== undefined && (
                <div className="score-item">
                  <span className="score-label">Complexion:</span>
                  <span className="score-value">{candidate.physical_traits_scores.complexion.toFixed(1)}</span>
                </div>
              )}
              {candidate.physical_traits_scores.overall !== null && candidate.physical_traits_scores.overall !== undefined && (
                <div className="score-item highlight">
                  <span className="score-label">Overall:</span>
                  <span className="score-value">{candidate.physical_traits_scores.overall.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {candidate.life_events_scores && (
          <div className="scores-section">
            <h4>Life Events Scores</h4>
            <div className="scores-grid">
              {candidate.life_events_scores.marriage !== null && candidate.life_events_scores.marriage !== undefined && (
                <div className="score-item">
                  <span className="score-label">Marriage:</span>
                  <span className="score-value">{candidate.life_events_scores.marriage.toFixed(1)}</span>
                </div>
              )}
              {candidate.life_events_scores.children !== null && candidate.life_events_scores.children !== undefined && (
                <div className="score-item">
                  <span className="score-label">Children:</span>
                  <span className="score-value">{candidate.life_events_scores.children.toFixed(1)}</span>
                </div>
              )}
              {candidate.life_events_scores.career !== null && candidate.life_events_scores.career !== undefined && (
                <div className="score-item">
                  <span className="score-label">Career:</span>
                  <span className="score-value">{candidate.life_events_scores.career.toFixed(1)}</span>
                </div>
              )}
              {candidate.life_events_scores.overall !== null && candidate.life_events_scores.overall !== undefined && (
                <div className="score-item highlight">
                  <span className="score-label">Overall:</span>
                  <span className="score-value">{candidate.life_events_scores.overall.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {candidate.special_lagnas && (
          <div className="special-lagnas-section">
            <h4>Special Lagnas (BPHS 4.18-28)</h4>
            <div className="lagnas-grid">
              <div className="lagna-item">
                <span className="lagna-label">Bhava Lagna (BPHS 4.18):</span>
                <span className="lagna-value">{degToSign(candidate.special_lagnas.bhava_lagna)}</span>
              </div>
              <div className="lagna-item">
                <span className="lagna-label">Hora Lagna (BPHS 4.20-21):</span>
                <span className="lagna-value">{degToSign(candidate.special_lagnas.hora_lagna)}</span>
              </div>
              <div className="lagna-item">
                <span className="lagna-label">Ghati Lagna (BPHS 4.22-24):</span>
                <span className="lagna-value">{degToSign(candidate.special_lagnas.ghati_lagna)}</span>
              </div>
              <div className="lagna-item">
                <span className="lagna-label">Varnada Lagna (BPHS 4.26-28):</span>
                <span className="lagna-value">{degToSign(candidate.special_lagnas.varnada_lagna)}</span>
              </div>
            </div>
            <div className="bphs-explanation">
              <p className="explanation-text">
                <strong>Special Lagnas:</strong> These supplementary lagnas provide additional verification 
                per BPHS Verses 4.18-28. Bhava Lagna (every 5 ghatis), Hora Lagna (every 2.5 ghatis), 
                Ghati Lagna (1 ghati = 1 sign), and Varnada Lagna (calculated from Janma + Hora lagnas) 
                are used for consistency checks.
              </p>
            </div>
          </div>
        )}
        {candidate.nisheka && (
          <div className="nisheka-section">
            <h4>Nisheka Lagna (BPHS 4.12-16)</h4>
            <div className="info-item">
              <strong>Nisheka Lagna:</strong> {degToSign(candidate.nisheka.nisheka_lagna_deg)}
            </div>
            <div className="info-item">
              <strong>Gestation Period:</strong> {candidate.nisheka.gestation_months.toFixed(1)} months
              <span className={candidate.nisheka.is_realistic ? 'pass' : 'fail'}>
                {candidate.nisheka.is_realistic ? ' ✓ Realistic' : ' ⚠ Unrealistic'}
              </span>
            </div>
            <div className="info-item">
              <strong>Gestation Score:</strong> {candidate.nisheka.gestation_score.toFixed(1)}/100
            </div>
            <div className="bphs-explanation">
              <p className="explanation-text">
                <strong>BPHS 4.14 (Nisheka Calculation):</strong> Conception time (Nisheka) is calculated 
                using Saturn's position, Gulika lagna, and the 9th house from lagna. The gestation period 
                should be approximately 9 lunar months (5-10.5 months) for realistic human birth. 
                {candidate.nisheka.is_realistic 
                  ? ' This candidate shows a realistic gestation period.' 
                  : ' This candidate shows an unrealistic gestation period, which may indicate calculation adjustment needed.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CandidateCard;

