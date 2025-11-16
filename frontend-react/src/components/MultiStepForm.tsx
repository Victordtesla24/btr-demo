import { useState, useEffect } from 'react';
import type { BTRRequest, PhysicalTraits, LifeEvents } from '../types';
import { geocodePlace } from '../services/api';
import './MultiStepForm.css';

interface MultiStepFormProps {
  onSubmit: (request: BTRRequest) => void;
}

type Step = 'mandatory' | 'optional' | 'review';

export function MultiStepForm({ onSubmit }: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>('mandatory');
  
  // Mandatory fields
  const [dob, setDob] = useState('');
  const [pob, setPob] = useState('');
  const [pobGeocode, setPobGeocode] = useState<{ lat: number; lon: number; formatted: string } | null>(null);
  const [pobGeocoding, setPobGeocoding] = useState(false);
  const [pobGeocodeError, setPobGeocodeError] = useState<string | null>(null);
  const [tzOffset, setTzOffset] = useState(5);
  const [tzCustom, setTzCustom] = useState(false);
  const [tobMode, setTobMode] = useState<'unknown' | 'approx'>('unknown');
  const [tobCenter, setTobCenter] = useState('12:00');
  const [tobWindow, setTobWindow] = useState(3.0);
  const [overrideStart, setOverrideStart] = useState('');
  const [overrideEnd, setOverrideEnd] = useState('');
  
  // Optional fields
  const [height, setHeight] = useState('');
  const [build, setBuild] = useState('');
  const [complexion, setComplexion] = useState('');
  const [marriageDate, setMarriageDate] = useState('');
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenDates, setChildrenDates] = useState<string[]>([]);
  const [careerEvents, setCareerEvents] = useState('');

  const validateMandatory = (): boolean => {
    if (!dob || !dob.trim()) {
      alert('Please enter a date of birth (YYYY-MM-DD format)');
      return false;
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dob)) {
      alert('Date of birth must be in YYYY-MM-DD format');
      return false;
    }
    
    // Validate date is not in the future
    const dobDate = new Date(dob);
    const today = new Date();
    if (dobDate > today) {
      alert('Date of birth cannot be in the future');
      return false;
    }
    
    if (!pob || !pob.trim()) {
      alert('Please enter a place of birth');
      return false;
    }
    
    // Warn if geocoding failed but allow submission
    if (pobGeocodeError && pob.trim().length >= 3) {
      const proceed = confirm(
        `Warning: Could not geocode "${pob}". The location may not be found. Do you want to proceed anyway?`
      );
      if (!proceed) {
        return false;
      }
    }
    
    if (!validateTimeRange()) {
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'mandatory') {
      if (validateMandatory()) {
        setCurrentStep('optional');
      }
    } else if (currentStep === 'optional') {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'optional') {
      setCurrentStep('mandatory');
    } else if (currentStep === 'review') {
      setCurrentStep('optional');
    }
  };

  const handleSubmit = () => {
    if (!validateMandatory()) {
      setCurrentStep('mandatory');
      return;
    }

    const optionalTraits: PhysicalTraits | null = (height || build || complexion) ? {
      ...(height && { height }),
      ...(build && { build }),
      ...(complexion && { complexion }),
    } : null;

    const optionalEvents: LifeEvents | null = (marriageDate || childrenCount > 0 || careerEvents) ? {
      ...(marriageDate && { marriage: { date: marriageDate } }),
      ...(childrenCount > 0 && { children: { count: childrenCount, dates: childrenDates } }),
      ...(careerEvents && { career: careerEvents.split(',').map(d => d.trim()).filter(d => d) }),
    } : null;

    const validTzOffset = (typeof tzOffset === 'number' && !isNaN(tzOffset)) ? tzOffset : 5;
    
    const request: BTRRequest = {
      dob: dob.trim(),
      pob_text: pob.trim(),
      tz_offset_hours: validTzOffset,
      approx_tob: {
        mode: tobMode,
        center: tobMode === 'approx' ? tobCenter : null,
        window_hours: tobMode === 'approx' ? tobWindow : null,
      },
      time_range_override: (overrideStart && overrideEnd) ? {
        start: overrideStart,
        end: overrideEnd,
      } : null,
      optional_traits: optionalTraits,
      optional_events: optionalEvents,
    };

    onSubmit(request);
  };

  const updateChildrenDates = (index: number, value: string) => {
    const newDates = [...childrenDates];
    newDates[index] = value;
    setChildrenDates(newDates);
  };

  // Geocode place of birth when user stops typing
  useEffect(() => {
    if (!pob || pob.trim().length < 3) {
      setPobGeocode(null);
      setPobGeocodeError(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setPobGeocoding(true);
      setPobGeocodeError(null);
      try {
        const result = await geocodePlace(pob.trim());
        setPobGeocode(result);
        setPobGeocodeError(null);
      } catch (err) {
        setPobGeocode(null);
        setPobGeocodeError(err instanceof Error ? err.message : 'Geocoding failed');
      } finally {
        setPobGeocoding(false);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [pob]);

  const validateTimeRange = (): boolean => {
    if (overrideStart && overrideEnd) {
      const [startH, startM] = overrideStart.split(':').map(Number);
      const [endH, endM] = overrideEnd.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (startMinutes >= endMinutes) {
        alert('Start time must be before end time');
        return false;
      }
    }
    return true;
  };

  return (
    <div className="multi-step-form">
      {/* Progress Indicator */}
      <div className="progress-indicator">
        <div className={`progress-step ${currentStep === 'mandatory' ? 'active' : currentStep === 'optional' || currentStep === 'review' ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Mandatory Info</div>
        </div>
        <div className={`progress-step ${currentStep === 'optional' ? 'active' : currentStep === 'review' ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Optional Verification</div>
        </div>
        <div className={`progress-step ${currentStep === 'review' ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Review & Submit</div>
        </div>
      </div>

      {/* Step Content */}
      <div className="step-content">
        {currentStep === 'mandatory' && (
          <div className="step-panel">
            <h2>Phase 0: Input Collection</h2>
            <p className="step-description">
              Enter the essential birth details required for BPHS Birth Time Rectification. 
              Based on Brihat Parashara Hora Shastra - Chapter 4 (लग्नाध्याय).
            </p>
            <div className="workflow-info">
              <p><strong>BPHS Workflow Overview:</strong></p>
              <ul>
                <li><strong>Phase 1:</strong> Candidate time generation (Swiss Ephemeris calculations)</li>
                <li><strong>Phase 2:</strong> Gulika calculation (BPHS 4.1-4.3) - Primary verification</li>
                <li><strong>Phase 3:</strong> Pranapada calculation (BPHS 4.5, 4.7) - Madhya & Sphuta</li>
                <li><strong>Phase 4:</strong> Hard BPHS filters - Trine Rule (BPHS 4.10) is MANDATORY</li>
                <li><strong>Phase 5:</strong> Special Lagnas (Bhava, Hora, Ghati, Varnada - BPHS 4.18-28)</li>
                <li><strong>Phase 6:</strong> Nisheka Lagna (Conception verification - BPHS 4.12-16)</li>
                <li><strong>Phase 7:</strong> Scoring & Ranking (composite score calculation)</li>
                <li><strong>Phase 8:</strong> Final Output (top candidates with detailed results)</li>
              </ul>
              <p className="workflow-note">
                <strong>Note:</strong> All candidates must pass the Trine Rule (BPHS 4.10) for human birth verification. 
                The birth lagna must be in a trine position (1st, 5th, or 9th) from Pranapada's rashi.
              </p>
            </div>
            
            <fieldset>
              <legend>Required Information</legend>
              <div>
                <label htmlFor="dob">Date of Birth:</label>
                <input
                  type="date"
                  id="dob"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="pob">Place of Birth:</label>
                <input
                  type="text"
                  id="pob"
                  value={pob}
                  onChange={(e) => setPob(e.target.value)}
                  placeholder="City, Country"
                  required
                />
                <small>Example: New York, NY or Sialkot, Pakistan</small>
                {pobGeocoding && (
                  <div className="geocode-status geocoding">
                    <span>🔍 Validating location...</span>
                  </div>
                )}
                {pobGeocode && !pobGeocoding && (
                  <div className="geocode-status geocode-success">
                    <span>✓ Found: {pobGeocode.formatted}</span>
                    <small>Lat: {pobGeocode.lat.toFixed(6)}, Lon: {pobGeocode.lon.toFixed(6)}</small>
                  </div>
                )}
                {pobGeocodeError && !pobGeocoding && (
                  <div className="geocode-status geocode-error">
                    <span>⚠ {pobGeocodeError}</span>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="tz-select">Time Zone:</label>
                <select
                  id="tz-select"
                  value={tzCustom ? 'custom' : String(tzOffset)}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setTzCustom(true);
                    } else {
                      setTzCustom(false);
                      setTzOffset(parseFloat(e.target.value));
                    }
                  }}
                >
                  <option value="5">Asia/Karachi (UTC+5)</option>
                  <option value="5.5">Asia/Kolkata (UTC+5:30)</option>
                  <option value="0">UTC (UTC+0)</option>
                  <option value="-5">America/New_York (UTC-5)</option>
                  <option value="custom">Custom Offset</option>
                </select>
              </div>
              {tzCustom && (
                <div>
                  <label htmlFor="tz">Time Zone Offset (hours from UTC):</label>
                  <input
                    type="number"
                    step="0.5"
                    id="tz"
                    value={tzOffset}
                    onChange={(e) => setTzOffset(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <small>Positive for east of UTC, negative for west</small>
                </div>
              )}
              <div>
                <label>Approximate Time of Birth:</label>
                <select
                  id="tob-mode"
                  value={tobMode}
                  onChange={(e) => setTobMode(e.target.value as 'unknown' | 'approx')}
                >
                  <option value="unknown">Unknown (full 24h search)</option>
                  <option value="approx">Approximate Time</option>
                </select>
                {tobMode === 'approx' && (
                  <div className="tob-approx-fields">
                    <input
                      type="time"
                      id="tob-center"
                      value={tobCenter}
                      onChange={(e) => setTobCenter(e.target.value)}
                    />
                    <label htmlFor="tob-window">± Hours:</label>
                    <input
                      type="number"
                      id="tob-window"
                      step="0.5"
                      value={tobWindow}
                      onChange={(e) => setTobWindow(parseFloat(e.target.value) || 3.0)}
                      min="0.5"
                      max="12"
                    />
                  </div>
                )}
              </div>
              <div>
                <label>Time Range Override (optional):</label>
                <div className="time-range-override">
                  <div className="time-input-group">
                    <label htmlFor="override-start" className="time-label">Start Time:</label>
                    <input
                      type="time"
                      id="override-start"
                      value={overrideStart}
                      onChange={(e) => setOverrideStart(e.target.value)}
                      placeholder="HH:MM"
                    />
                  </div>
                  <span className="time-separator">to</span>
                  <div className="time-input-group">
                    <label htmlFor="override-end" className="time-label">End Time:</label>
                    <input
                      type="time"
                      id="override-end"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                      placeholder="HH:MM"
                    />
                  </div>
                </div>
                <small>If provided, overrides approximate time settings. Format: HH:MM (24-hour)</small>
                {overrideStart && overrideEnd && (
                  <div className="time-range-preview">
                    <small>Time Range: {overrideStart} - {overrideEnd}</small>
                  </div>
                )}
              </div>
            </fieldset>

            <div className="step-actions">
              <button type="button" onClick={handleNext} className="btn-primary">
                Next: Optional Verification →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'optional' && (
          <div className="step-panel">
            <h2>Phase 0: Optional Verification Data</h2>
            <p className="step-description">
              Provide additional information to improve rectification accuracy. All fields are optional.
              This data will be used for verification against BPHS Chapter 2 (physical traits) and Chapter 12 (life events).
            </p>
            <div className="workflow-info">
              <p><strong>How optional data is used:</strong></p>
              <ul>
                <li><strong>Physical Traits:</strong> Verified against BPHS Chapter 2 (2.3-2.23) - Lagna-based characteristics</li>
                <li><strong>Life Events:</strong> Verified using Vimshottari Dasha and Divisional Charts (D-3, D-7, D-9, D-10, D-12, D-60)</li>
                <li><strong>Scoring:</strong> Optional verification adds to the composite score but is not mandatory</li>
              </ul>
            </div>

            <fieldset>
              <legend>Physical Traits (for verification)</legend>
              <div className="traits-grid">
                <div>
                  <label htmlFor="height">Height:</label>
                  <select
                    id="height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  >
                    <option value="">Not specified</option>
                    <option value="SHORT">Short</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="TALL">Tall</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="build">Build:</label>
                  <select
                    id="build"
                    value={build}
                    onChange={(e) => setBuild(e.target.value)}
                  >
                    <option value="">Not specified</option>
                    <option value="SLIM">Slim</option>
                    <option value="ATHLETIC">Athletic</option>
                    <option value="HEAVY">Heavy</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="complexion">Complexion:</label>
                  <select
                    id="complexion"
                    value={complexion}
                    onChange={(e) => setComplexion(e.target.value)}
                  >
                    <option value="">Not specified</option>
                    <option value="FAIR">Fair</option>
                    <option value="WHEATISH">Wheatish</option>
                    <option value="DARK">Dark</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Life Events (for verification)</legend>
              <div>
                <label htmlFor="marriage-date">Marriage Date:</label>
                <input
                  type="date"
                  id="marriage-date"
                  value={marriageDate}
                  onChange={(e) => setMarriageDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="children-count">Number of Children:</label>
                <input
                  type="number"
                  id="children-count"
                  min="0"
                  value={childrenCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 0;
                    setChildrenCount(count);
                    // Adjust childrenDates array
                    const newDates = [...childrenDates];
                    while (newDates.length < count) {
                      newDates.push('');
                    }
                    while (newDates.length > count) {
                      newDates.pop();
                    }
                    setChildrenDates(newDates);
                  }}
                />
                {childrenCount > 0 && (
                  <div className="children-dates">
                    {Array.from({ length: childrenCount }).map((_, i) => (
                      <div key={i}>
                        <label htmlFor={`child-${i}`}>Child {i + 1} Birth Date:</label>
                        <input
                          type="date"
                          id={`child-${i}`}
                          value={childrenDates[i] || ''}
                          onChange={(e) => updateChildrenDates(i, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="career-events">Major Career Events (comma-separated dates):</label>
                <input
                  type="text"
                  id="career-events"
                  value={careerEvents}
                  onChange={(e) => setCareerEvents(e.target.value)}
                  placeholder="YYYY-MM-DD, YYYY-MM-DD"
                />
                <small>Enter dates separated by commas</small>
              </div>
            </fieldset>

            <div className="step-actions">
              <button type="button" onClick={handleBack} className="btn-secondary">
                ← Back
              </button>
              <button type="button" onClick={handleNext} className="btn-primary">
                Next: Review & Submit →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="step-panel">
            <h2>Review & Submit</h2>
            <p className="step-description">
              Review your information before submitting for BPHS Birth Time Rectification.
            </p>

            <div className="review-section">
              <h3>Mandatory Information</h3>
              <dl>
                <dt>Date of Birth:</dt>
                <dd>{dob || 'Not set'}</dd>
                <dt>Place of Birth:</dt>
                <dd>{pob || 'Not set'}</dd>
                <dt>Time Zone:</dt>
                <dd>{tzCustom ? `${tzOffset} hours` : `${tzOffset} hours`}</dd>
                <dt>Time of Birth:</dt>
                <dd>
                  {tobMode === 'unknown' 
                    ? 'Unknown (full 24h search)' 
                    : `Approximate: ${tobCenter} ± ${tobWindow} hours`}
                </dd>
                {(overrideStart && overrideEnd) && (
                  <>
                    <dt>Time Range Override:</dt>
                    <dd>{overrideStart} to {overrideEnd}</dd>
                  </>
                )}
              </dl>
            </div>

            {(height || build || complexion || marriageDate || childrenCount > 0 || careerEvents) && (
              <div className="review-section">
                <h3>Optional Verification Data</h3>
                <dl>
                  {(height || build || complexion) && (
                    <>
                      <dt>Physical Traits:</dt>
                      <dd>
                        {height && `Height: ${height}`}
                        {build && ` | Build: ${build}`}
                        {complexion && ` | Complexion: ${complexion}`}
                      </dd>
                    </>
                  )}
                  {marriageDate && (
                    <>
                      <dt>Marriage Date:</dt>
                      <dd>{marriageDate}</dd>
                    </>
                  )}
                  {childrenCount > 0 && (
                    <>
                      <dt>Children:</dt>
                      <dd>{childrenCount} child(ren)</dd>
                    </>
                  )}
                  {careerEvents && (
                    <>
                      <dt>Career Events:</dt>
                      <dd>{careerEvents}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            <div className="step-actions">
              <button type="button" onClick={handleBack} className="btn-secondary">
                ← Back
              </button>
              <button type="button" onClick={handleSubmit} className="btn-primary">
                Calculate BTR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

