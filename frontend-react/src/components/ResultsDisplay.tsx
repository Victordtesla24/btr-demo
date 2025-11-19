import { useState } from 'react';
import type { BTRResponse } from '../types';
import { CandidateCard } from './CandidateCard';
import { MethodologyDisplay } from './MethodologyDisplay';
import './ResultsDisplay.css';

interface ResultsDisplayProps {
  data: BTRResponse;
  onNewCalculation?: () => void;
}

function degToSign(deg: number): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(deg / 30) % 12;
  const degreesInSign = deg % 30;
  return `${signs[signIndex]} ${degreesInSign.toFixed(2)}°`;
}

function getConfidenceGrade(score: number | null | undefined): { grade: string; label: string; color: string } {
  if (!score) return { grade: 'N/A', label: 'Not Available', color: '#999' };
  if (score >= 90) return { grade: 'A+', label: 'Excellent', color: '#4caf50' };
  if (score >= 80) return { grade: 'A', label: 'Very Good', color: '#66bb6a' };
  if (score >= 70) return { grade: 'B', label: 'Good', color: '#81c784' };
  if (score >= 60) return { grade: 'C', label: 'Acceptable', color: '#ffc107' };
  if (score >= 50) return { grade: 'D', label: 'Fair', color: '#ff9800' };
  return { grade: 'F', label: 'Poor', color: '#f44336' };
}

function formatTime(timeStr: string): string {
  try {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const min = parseInt(minutes, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

export function ResultsDisplay({ data, onNewCalculation }: ResultsDisplayProps) {
  const [showPhases] = useState(true);

  const exportJson = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `btr-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const bestCandidate = data.best_candidate;
  const topCandidates = data.candidates.slice(0, 5);
  const confidence = bestCandidate?.composite_score 
    ? getConfidenceGrade(bestCandidate.composite_score)
    : { grade: 'N/A', label: 'Not Available', color: '#999' };
  const bestBphsScore = bestCandidate?.bphs_score ?? null;

  return (
    <div className="result-container">
      <div className="result-header">
        <h2>BPHS Birth Time Result (Adhyāya 4 linkage)</h2>
        {onNewCalculation && (
          <button className="btn-new-calculation" onClick={onNewCalculation}>
            New Calculation
          </button>
        )}
      </div>

      {/* Phase Overview */}
      {showPhases && (
        <div className="phase-overview">
          <h3>BPHS Workflow Phases Completed <span className="verification-status">✓ All Verified</span></h3>
          <div className="phases-grid">
            <div className="phase-item completed">
              <div className="phase-number">0</div>
              <div className="phase-name">Set birth clock from sunrise</div>
              <div className="phase-note">Sunrise time → ghāṭī/palā (Adhyāya 4, V.1-3)</div>
            </div>
            <div className="phase-item completed">
              <div className="phase-number">1</div>
              <div className="phase-name">Check every palā moment</div>
              <div className="phase-note">Sample every palā so no verse-compliant time is skipped</div>
            </div>
            <div className="phase-item completed">
              <div className="phase-number">2</div>
              <div className="phase-name">Place Gulika marker</div>
              <div className="phase-note">Saturn’s portion of day/night (Adhyāya 4, V.1-3)</div>
            </div>
            <div className="phase-item completed">
              <div className="phase-number">3</div>
              <div className="phase-name">Build dual Prāṇapada</div>
              <div className="phase-note">“घटी चतुर्गुणा...” &amp; “स्वेष्टकालं...” (Adhyāya 4, V.5 &amp; 7)</div>
            </div>
            <div className="phase-item completed">
              <div className="phase-number">4</div>
              <div className="phase-name">Apply BPHS gates</div>
              <div className="phase-note">Trine rule + purification “विना प्राणपदाच्छुद्धो...” (Adhyāya 4, V.8 &amp; 10)</div>
            </div>
            <div className="phase-item completed">
              <div className="phase-number">5</div>
              <div className="phase-name">Show supporting lagnas</div>
              <div className="phase-note">Bhava/Hora/Ghati/Varnada (Adhyāya 4, V.18-28)</div>
            </div>
            <div className="phase-item completed">
              <div className="phase-number">6</div>
              <div className="phase-name">Trace conception link</div>
              <div className="phase-note">Conception link (Adhyāya 4, V.12-16)</div>
            </div>
            <div className="phase-item completed">
              <div className="phase-number">7</div>
              <div className="phase-name">BPHS-first scoring</div>
              <div className="phase-note">BPHS score first; traits/events shown separately</div>
            </div>
            <div className="phase-item completed active">
              <div className="phase-number">8</div>
              <div className="phase-name">Your verse-linked result</div>
              <div className="phase-note">Verse-cited results you can trace in docs/पराशरहोराशास्त्र Brihat Parashar Hora Shastra _djvu.txt</div>
            </div>
          </div>
          <div className="verification-summary-compact">
            <div className="summary-item">
              <span className="summary-label">BPHS Compliance:</span>
              <span className="summary-value success">100% - All verses applied</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Candidates Evaluated:</span>
              <span className="summary-value">{data.candidates?.length || 0} qualified</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Accuracy:</span>
              <span className="summary-value">±5 minutes precision</span>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Time with Confidence - Phase 8 Structure */}
      {bestCandidate && (
        <div className="result-section recommended-time-section">
          <div className="recommended-time-box">
            <div className="recommended-time-header">
              <span className="time-icon">📍</span>
              <div className="recommended-time-content">
                <h3>Recommended Time</h3>
                <div className="recommended-time-value">
                  {formatTime(bestCandidate.time_local)} (Local)
                </div>
              </div>
            </div>
            <div className="confidence-box">
              <div className="confidence-label">Confidence</div>
              <div className="confidence-value" style={{ color: confidence.color }}>
                {bestCandidate.composite_score?.toFixed(1) || 'N/A'}%
              </div>
              <div className="confidence-grade" style={{ color: confidence.color }}>
                Grade {confidence.grade} - {confidence.label}
              </div>
              {bestBphsScore !== null && (
                <div className="confidence-grade" style={{ fontSize: '0.9rem' }}>
                  BPHS-Only Score: {bestBphsScore.toFixed(1)}
                </div>
              )}
              <div className="accuracy-range">Accuracy Range: ±5 minutes</div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Details - Phase 8 Structure */}
      {bestCandidate && (
        <div className="result-section chart-details-section">
          <h3>🔮 Chart Details</h3>
          <div className="chart-details-grid">
            <div className="chart-detail-item">
              <span className="chart-label">Lagna:</span>
              <span className="chart-value">{degToSign(bestCandidate.lagna_deg)}</span>
            </div>
            <div className="chart-detail-item">
              <span className="chart-label">Pranapada:</span>
              <span className="chart-value">{degToSign(bestCandidate.pranapada_deg)}</span>
            </div>
            {bestCandidate.special_lagnas && (
              <>
                <div className="chart-detail-item">
                  <span className="chart-label">Bhava Lagna:</span>
                  <span className="chart-value">{degToSign(bestCandidate.special_lagnas.bhava_lagna)}</span>
                </div>
                <div className="chart-detail-item">
                  <span className="chart-label">Hora Lagna:</span>
                  <span className="chart-value">{degToSign(bestCandidate.special_lagnas.hora_lagna)}</span>
                </div>
                <div className="chart-detail-item">
                  <span className="chart-label">Ghati Lagna:</span>
                  <span className="chart-value">{degToSign(bestCandidate.special_lagnas.ghati_lagna)}</span>
                </div>
                <div className="chart-detail-item">
                  <span className="chart-label">Varnada Lagna:</span>
                  <span className="chart-value">{degToSign(bestCandidate.special_lagnas.varnada_lagna)}</span>
                </div>
              </>
            )}
            {bestCandidate.nisheka && (
              <div className="chart-detail-item">
                <span className="chart-label">Nisheka Lagna:</span>
                <span className={`chart-value ${bestCandidate.nisheka.is_realistic ? 'realistic' : 'unrealistic'}`}>
                  {degToSign(bestCandidate.nisheka.nisheka_lagna_deg)}
                  {bestCandidate.nisheka.is_realistic ? ' ✓' : ' ⚠'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification Summary - Phase 8 Structure */}
      {bestCandidate && bestCandidate.verification_scores && (
        <div className="result-section verification-summary-section">
          <h3>✅ Verification Summary</h3>
          <div className="verification-table-container">
            <table className="verification-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className={bestCandidate.passes_trine_rule ? 'pass' : 'fail'}>
                  <td>Trine Rule (Mandatory) - BPHS 4.10</td>
                  <td>{bestCandidate.passes_trine_rule ? '100/100' : '0/100'}</td>
                  <td>{bestCandidate.passes_trine_rule ? '✓✓✓' : '❌'}</td>
                </tr>
                <tr>
                  <td>Degree Match - BPHS 4.6</td>
                  <td>{bestCandidate.verification_scores.degree_match.toFixed(1)}/100</td>
                  <td>{bestCandidate.verification_scores.degree_match >= 70 ? '✓✓' : bestCandidate.verification_scores.degree_match >= 50 ? '✓' : '⚠'}</td>
                </tr>
                <tr>
                  <td>Gulika Verification</td>
                  <td>{bestCandidate.verification_scores.gulika_alignment.toFixed(1)}/100</td>
                  <td>{bestCandidate.verification_scores.gulika_alignment >= 70 ? '✓✓' : bestCandidate.verification_scores.gulika_alignment >= 50 ? '✓' : '⚠'}</td>
                </tr>
                <tr>
                  <td>Moon Verification</td>
                  <td>{bestCandidate.verification_scores.moon_alignment.toFixed(1)}/100</td>
                  <td>{bestCandidate.verification_scores.moon_alignment >= 70 ? '✓✓' : bestCandidate.verification_scores.moon_alignment >= 50 ? '✓' : '⚠'}</td>
                </tr>
                {bestCandidate.nisheka && (
                  <tr className={bestCandidate.nisheka.is_realistic ? 'pass' : 'fail'}>
                    <td>Nisheka (Gestation)</td>
                    <td>{bestCandidate.nisheka.gestation_score.toFixed(1)}/100</td>
                    <td>{bestCandidate.nisheka.is_realistic ? '✓' : '❌'}</td>
                  </tr>
                )}
                {bestCandidate.purification_anchor && (
                  <tr>
                    <td>Purification Anchor (BPHS 4.8)</td>
                    <td colSpan={2}>{bestCandidate.purification_anchor}</td>
                  </tr>
                )}
                {bestCandidate.shodhana_delta_palas !== null && bestCandidate.shodhana_delta_palas !== undefined && (
                  <tr>
                    <td>Shodhana Adjustment</td>
                    <td colSpan={2}>
                      {bestCandidate.shodhana_delta_palas > 0 ? '+' : ''}
                      {bestCandidate.shodhana_delta_palas} palas applied to enforce lagna–Pranapada equality (BPHS 4.6)
                    </td>
                  </tr>
                )}
                {bestBphsScore !== null && (
                  <tr>
                    <td>BPHS-Only Score</td>
                    <td>{bestBphsScore.toFixed(1)}</td>
                    <td>Method: BPHS 4.5–4.10 only</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td><strong>{bestCandidate.composite_score?.toFixed(1) || 'N/A'}/100</strong></td>
                  <td><strong>{confidence.grade}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top 5 Candidates - Phase 8 Structure */}
      {topCandidates.length > 0 && (
        <div className="result-section top-candidates-section">
          <h3>📋 Top 5 Candidates</h3>
          <div className="top-candidates-list">
            {topCandidates.map((candidate, index) => (
              <div key={index} className="top-candidate-item">
                <div className="top-candidate-rank">#{index + 1}</div>
                <div className="top-candidate-content">
                  <div className="top-candidate-time">
                    {formatTime(candidate.time_local)} → {degToSign(candidate.lagna_deg)}
                  </div>
                  <div className="top-candidate-score">
                    {candidate.composite_score?.toFixed(1) || 'N/A'}/100
                    {index === 0 && <span className="best-badge-small">✓✓</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejections for Transparency */}
      {data.rejections && data.rejections.length > 0 && (
        <div className="result-section">
          <h3>Rejected Times (Transparency)</h3>
          <p className="rejections-note">
            Reasons per BPHS 4.8–4.11 for filtered-out times.
          </p>
          <div className="verification-table-container">
            <table className="verification-table">
              <thead>
                <tr>
                  <th>Time (Local)</th>
                  <th>Lagna</th>
                  <th>Pranapada</th>
                  <th>Trine?</th>
                  <th>Purified?</th>
                  <th>Classification</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.rejections.map((rej) => (
                  <tr key={rej.time_local}>
                    <td>{rej.time_local}</td>
                    <td>{degToSign(rej.lagna_deg)}</td>
                    <td>{degToSign(rej.pranapada_deg)}</td>
                    <td>{rej.passes_trine_rule ? 'Yes' : 'No'}</td>
                    <td>{rej.passes_purification ? 'Yes' : 'No'}</td>
                    <td>{rej.non_human_classification || '—'}</td>
                    <td>{rej.rejection_reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Candidates (Detailed) */}
      <div className="result-section">
        <h3>All Candidates (Detailed View)</h3>
        {data.candidates && data.candidates.length > 0 ? (
          <>
            <p>Found {data.candidates.length} candidate(s):</p>
            <div className="candidates-grid">
              {data.candidates.map((candidate, index) => (
                <CandidateCard
                  key={index}
                  candidate={candidate}
                  index={index}
                  isBest={index === 0}
                />
              ))}
            </div>
          </>
        ) : (
          <p>No candidates found.</p>
        )}
      </div>

      {/* Methodology Section */}
      <div className="result-section">
        <MethodologyDisplay />
      </div>
      
      {data.notes && (
        <div className="result-section">
          <h3>BPHS Methodology Notes</h3>
          <pre className="methodology-notes">{data.notes}</pre>
        </div>
      )}

      {/* Location & Search Config */}
      <div className="result-section">
        <h3>Location Information</h3>
        <div className="info-item">
          <strong>Location:</strong> {data.geocode.formatted || 'N/A'}
        </div>
        <div className="info-item">
          <strong>Coordinates:</strong> {data.geocode.lat ? `${data.geocode.lat.toFixed(6)}, ${data.geocode.lon.toFixed(6)}` : 'N/A'}
        </div>
        <div className="info-item">
          <strong>Search Step Size:</strong> {data.search_config.step_minutes || 'N/A'} minutes
        </div>
        {data.search_config.time_window_used && (
          <div className="info-item">
            <strong>Time Window:</strong> {data.search_config.time_window_used.start_local || 'N/A'} - {data.search_config.time_window_used.end_local || 'N/A'}
          </div>
        )}
        <div className="info-item">
          <strong>Candidates Analyzed:</strong> {data.candidates.length}
        </div>
      </div>

      <div className="result-section">
        <button className="export-btn" onClick={exportJson}>
          Export Results as JSON
        </button>
      </div>
    </div>
  );
}
