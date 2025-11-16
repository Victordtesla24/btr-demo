import { useState, useEffect } from 'react';
import './LoadingSpinner.css';

const phases = [
  { 
    num: 0, 
    name: 'Input Collection', 
    desc: 'Processing your input data',
    details: 'Validating date of birth, geocoding place of birth, and preparing time range for candidate generation'
  },
  { 
    num: 1, 
    name: 'Candidate Time Generation', 
    desc: 'Generating candidate times using Swiss Ephemeris',
    details: 'Creating time candidates at 2-minute intervals. Calculating sunrise/sunset, lagna positions, and planetary positions for each candidate'
  },
  { 
    num: 2, 
    name: 'Gulika Calculation', 
    desc: 'Calculating Gulika (BPHS 4.1-4.3) - Primary Verification',
    details: 'Dividing day into 8 khandas, identifying Saturn\'s khanda (Gulika period), and calculating Gulika Lagna for each candidate'
  },
  { 
    num: 3, 
    name: 'Pranapada Calculation', 
    desc: 'Calculating Pranapada (BPHS 4.5, 4.7) - Primary Rectification',
    details: 'Computing Ishta Kala, applying Madhya Pranapada (rough) and Sphuta Pranapada (accurate) methods based on Sun\'s rashi type'
  },
  { 
    num: 4, 
    name: 'Hard BPHS Filters', 
    desc: 'Applying mandatory filters (BPHS 4.6, 4.8, 4.10)',
    details: 'Trine Rule (4.10) - MANDATORY: Verifying birth lagna is in trine from Pranapada. Degree matching (4.6) and Triple Verification (4.8)'
  },
  { 
    num: 5, 
    name: 'Special Lagnas', 
    desc: 'Calculating Bhava, Hora, Ghati, Varnada (BPHS 4.18-28)',
    details: 'Computing supplementary lagnas: Bhava (every 5 ghatis), Hora (every 2.5 ghatis), Ghati (1 ghati = 1 sign), and Varnada Lagna'
  },
  { 
    num: 6, 
    name: 'Nisheka Lagna', 
    desc: 'Verifying conception & gestation (BPHS 4.12-16)',
    details: 'Calculating Nisheka Lagna from Saturn, Gulika, and 9th house. Verifying gestation period (should be ~9 lunar months)'
  },
  { 
    num: 7, 
    name: 'Scoring & Ranking', 
    desc: 'Calculating composite scores and ranking candidates',
    details: 'Weighted scoring: Degree Match (30%), Gulika (15%), Moon (15%), Nisheka (10%), Trine Rule (30%). Ranking by composite score'
  },
  { 
    num: 8, 
    name: 'Final Output', 
    desc: 'Preparing final results',
    details: 'Compiling top candidates, verification summaries, special lagnas, and methodology notes. Ready to display results'
  },
];

export function LoadingSpinner() {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % phases.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Calculating BTR using BPHS methods...</p>
      <div className="phase-progress">
        <div className="phase-current">
          <div className="phase-header">
            <span className="phase-number-badge">Phase {phases[currentPhase].num}</span>
            <strong>{phases[currentPhase].name}</strong>
          </div>
          <span className="phase-desc">{phases[currentPhase].desc}</span>
          <div className="phase-details">
            <p>{phases[currentPhase].details}</p>
          </div>
        </div>
        <div className="phases-timeline">
          <div className="phases-list">
            {phases.map((phase, idx) => (
              <div 
                key={phase.num} 
                className={`phase-indicator ${idx < currentPhase ? 'completed' : idx === currentPhase ? 'active' : 'pending'}`}
              >
                <div className="phase-indicator-content">
                  <span className="phase-dot"></span>
                  <div className="phase-info">
                    <span className="phase-label">Phase {phase.num}</span>
                    <span className="phase-name-small">{phase.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="loading-detail">This may take a few moments</p>
    </div>
  );
}

