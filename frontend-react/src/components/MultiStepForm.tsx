import { useState, useEffect } from 'react';
import type {
  BTRRequest,
  PhysicalTraits,
  LifeEvents,
  MarriageEvent,
  ChildEvent,
  CareerEvent,
  MajorEvent,
} from '../types';
import { geocodePlace } from '../services/api';
import { FamilyStep } from './FamilyStep';
import './MultiStepForm.css';

interface MultiStepFormProps {
  onSubmit: (request: BTRRequest) => void;
}

type Step = 'mandatory' | 'traits' | 'family' | 'events' | 'review';

export function MultiStepForm({ onSubmit }: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>('mandatory');

  // Mandatory fields
  const [dob, setDob] = useState('');
  const [pob, setPob] = useState('');
  const [pobGeocode, setPobGeocode] = useState<{ lat: number; lon: number; formatted: string; tz_offset_hours?: number | null; timezone_name?: string | null } | null>(null);
  const [pobGeocoding, setPobGeocoding] = useState(false);
  const [pobGeocodeError, setPobGeocodeError] = useState<string | null>(null);
  const [tzOffset, setTzOffset] = useState(5);
  const [tzCustom, setTzCustom] = useState(false);
  const [tobMode, setTobMode] = useState<'unknown' | 'approx'>('unknown');
  const [tobCenter, setTobCenter] = useState('12:00');
  const [tobWindow, setTobWindow] = useState(3.0);
  const [overrideStart, setOverrideStart] = useState('');
  const [overrideEnd, setOverrideEnd] = useState('');
  const [prashnaMode, setPrashnaMode] = useState(false);

  // Physical traits (granular)
  const [heightValue, setHeightValue] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft_in'>('cm');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [heightBand, setHeightBand] = useState('');
  const [buildBand, setBuildBand] = useState('');
  const [bodyFrame, setBodyFrame] = useState('');
  const [complexionTone, setComplexionTone] = useState('');
  const [traitNotes, setTraitNotes] = useState('');

  // Life events (multi-entry)
  const [marriages, setMarriages] = useState<MarriageEvent[]>([{ date: '', place: '', notes: '' }]);
  const [children, setChildren] = useState<ChildEvent[]>([{ date: '', notes: '' }]);
  const [careerEvents, setCareerEvents] = useState<CareerEvent[]>([{ date: '', role: '', description: '' }]);
  const [majorEvents, setMajorEvents] = useState<MajorEvent[]>([{ date: '', title: '', description: '' }]);
  
  // Family Details (siblings, parents)
  const [siblings, setSiblings] = useState<{type: string, count: number}[]>([]);
  const [parents, setParents] = useState<{relation: string, is_alive: boolean, death_date?: string}[]>([]);

  // ---------------------------------------------------------------------------
  // Validation and helpers
  // ---------------------------------------------------------------------------

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

  // Helper to format dates to DD-MM-YYYY for API
  const formatDateToDDMMYYYY = (dateStr: string): string => {
    if (!dateStr || !dateStr.trim()) return '';
    // Input is YYYY-MM-DD from HTML input
    const [year, month, day] = dateStr.trim().split('-');
    if (year && month && day) {
      return `${day}-${month}-${year}`;
    }
    return dateStr; // fallback
  };

  const handleNext = () => {
    if (currentStep === 'mandatory') {
      if (validateMandatory()) {
        setCurrentStep('traits');
      }
    } else if (currentStep === 'traits') {
      setCurrentStep('family');
    } else if (currentStep === 'family') {
      setCurrentStep('events');
    } else if (currentStep === 'events') {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'traits') {
      setCurrentStep('mandatory');
    } else if (currentStep === 'family') {
      setCurrentStep('traits');
    } else if (currentStep === 'events') {
      setCurrentStep('family');
    } else if (currentStep === 'review') {
      setCurrentStep('events');
    }
  };

  const toNumber = (value: string): number | null => {
    if (!value.trim()) return null;
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  };

  const deriveHeightCm = (): number | null => {
    if (heightUnit === 'cm') {
      return toNumber(heightValue);
    }
    const feet = toNumber(heightFeet);
    const inches = toNumber(heightInches) ?? 0;
    if (feet === null) return null;
    return Math.round(((feet * 12) + inches) * 2.54 * 100) / 100;
  };

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

  // ---------------------------------------------------------------------------
  // Submission assembly
  // ---------------------------------------------------------------------------

  const handleSubmit = () => {
    if (!validateMandatory()) {
      setCurrentStep('mandatory');
      return;
    }

    const heightCm = deriveHeightCm();
    const resolvedHeightBand = (heightBand || '').toUpperCase() as PhysicalTraits['height_band'];
    const derivedBand = (() => {
      if (resolvedHeightBand) return resolvedHeightBand;
      if (heightCm === null) return '';
      if (heightCm >= 175) return 'TALL';
      if (heightCm <= 160) return 'SHORT';
      return 'MEDIUM';
    })();

    const buildBandUpper = (buildBand || '').toUpperCase() as PhysicalTraits['build_band'];
    const complexionUpper = (complexionTone || '').toUpperCase() as PhysicalTraits['complexion_tone'];

    const optionalTraits: PhysicalTraits | null = (heightCm || derivedBand || buildBandUpper || complexionUpper || bodyFrame || traitNotes) ? {
      ...(heightCm ? { height_cm: heightCm } : {}),
      ...(heightUnit === 'ft_in' && toNumber(heightFeet) !== null ? { height_feet: toNumber(heightFeet) ?? undefined } : {}),
      ...(heightUnit === 'ft_in' && toNumber(heightInches) !== null ? { height_inches: toNumber(heightInches) ?? undefined } : {}),
      ...(heightBand ? { height_band: resolvedHeightBand, height: resolvedHeightBand } : {}),
      ...(heightCm && !heightBand ? { height_band: derivedBand as PhysicalTraits['height_band'], height: derivedBand } : {}),
      ...(buildBandUpper ? { build_band: buildBandUpper, build: buildBandUpper } : {}),
      ...(bodyFrame ? { body_frame: bodyFrame } : {}),
      ...(complexionUpper ? { complexion_tone: complexionUpper, complexion: complexionUpper } : {}),
      ...(traitNotes ? { notes: traitNotes.trim() } : {}),
    } : null;

    const normalizeEvents = <T extends { date?: string | null }>(events: T[]) =>
      events
        .filter((e) => e.date && e.date.trim())
        .map((e) => ({ ...e, date: formatDateToDDMMYYYY(e.date!.trim()) }));

    const normalizedMarriages = normalizeEvents(marriages) as MarriageEvent[];
    const normalizedChildren = normalizeEvents(children) as ChildEvent[];
    const normalizedCareer = normalizeEvents(careerEvents) as CareerEvent[];
    const normalizedMajor = normalizeEvents(majorEvents) as MajorEvent[];
    
    const normalizedParents = parents.map(p => ({
        ...p,
        death_date: p.death_date ? formatDateToDDMMYYYY(p.death_date) : undefined
    }));

    const optionalEvents: LifeEvents | null = (normalizedMarriages.length ||
      normalizedChildren.length ||
      normalizedCareer.length ||
      normalizedMajor.length ||
      siblings.length ||
      normalizedParents.length)
      ? {
          ...(normalizedMarriages.length ? { marriages: normalizedMarriages, marriage: normalizedMarriages[0] } : {}),
          ...(normalizedChildren.length ? { children: normalizedChildren } : {}),
          ...(normalizedCareer.length ? { career: normalizedCareer } : {}),
          ...(normalizedMajor.length ? { major: normalizedMajor } : {}),
          ...(siblings.length ? { siblings } : {}),
          ...(normalizedParents.length ? { parents: normalizedParents } : {}),
        }
      : null;

    const validTzOffset = (typeof tzOffset === 'number' && !isNaN(tzOffset)) ? tzOffset : 5;

    const request: BTRRequest = {
      dob: formatDateToDDMMYYYY(dob.trim()),
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
      prashna_mode: prashnaMode,
      optional_traits: optionalTraits,
      optional_events: optionalEvents,
    };

    onSubmit(request);
  };

  // ---------------------------------------------------------------------------
  // Effects and data fetch
  // ---------------------------------------------------------------------------

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
        if (typeof result.tz_offset_hours === 'number' && !isNaN(result.tz_offset_hours)) {
          setTzOffset(result.tz_offset_hours);
          setTzCustom(false);
        }
      } catch (err) {
        setPobGeocode(null);
        setPobGeocodeError(err instanceof Error ? err.message : 'Geocoding failed');
      } finally {
        setPobGeocoding(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [pob]);

  // ---------------------------------------------------------------------------
  // Dynamic row handlers
  // ---------------------------------------------------------------------------

  const updateMarriageField = (index: number, field: keyof MarriageEvent, value: string) => {
    const next = [...marriages];
    next[index] = { ...next[index], [field]: value };
    setMarriages(next);
  };
  const addMarriageRow = () => setMarriages([...marriages, { date: '', place: '', notes: '' }]);
  const removeMarriageRow = (index: number) => setMarriages(marriages.filter((_, i) => i !== index));

  const updateChildField = (index: number, field: keyof ChildEvent, value: string) => {
    const next = [...children];
    next[index] = { ...next[index], [field]: value };
    setChildren(next);
  };
  const addChildRow = () => setChildren([...children, { date: '', notes: '' }]);
  const removeChildRow = (index: number) => setChildren(children.filter((_, i) => i !== index));

  const updateCareerField = (index: number, field: keyof CareerEvent, value: string) => {
    const next = [...careerEvents];
    next[index] = { ...next[index], [field]: value };
    setCareerEvents(next);
  };
  const addCareerRow = () => setCareerEvents([...careerEvents, { date: '', role: '', description: '' }]);
  const removeCareerRow = (index: number) => setCareerEvents(careerEvents.filter((_, i) => i !== index));

  const updateMajorField = (index: number, field: keyof MajorEvent, value: string) => {
    const next = [...majorEvents];
    next[index] = { ...next[index], [field]: value };
    setMajorEvents(next);
  };
  const addMajorRow = () => setMajorEvents([...majorEvents, { date: '', title: '', description: '' }]);
  const removeMajorRow = (index: number) => setMajorEvents(majorEvents.filter((_, i) => i !== index));

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="multi-step-form">
      <div className="progress-indicator">
        <div className={`progress-step ${currentStep === 'mandatory' ? 'active' : ['traits', 'events', 'review'].includes(currentStep) ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Mandatory Info</div>
        </div>
        <div className={`progress-step ${currentStep === 'traits' ? 'active' : ['family', 'events', 'review'].includes(currentStep) ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Physical Traits</div>
        </div>
        <div className={`progress-step ${currentStep === 'family' ? 'active' : ['events', 'review'].includes(currentStep) ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Family</div>
        </div>
        <div className={`progress-step ${currentStep === 'events' ? 'active' : currentStep === 'review' ? 'completed' : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">Life Events</div>
        </div>
        <div className={`progress-step ${currentStep === 'review' ? 'active' : ''}`}>
          <div className="step-number">5</div>
          <div className="step-label">Review & Submit</div>
        </div>
      </div>

      <div className="step-content">
        {currentStep === 'mandatory' && (
          <div className="step-panel">
            <h2>Step 1: Birth Details (Adhyāya 4 – Lagna setup)</h2>
            <p className="step-description">
              Enter your birth details so we can apply Brihat Parāśara Horā Śāstra, Chapter 4 (लग्नाध्याय) exactly as written.
            </p>
            <div className="workflow-info">
              <p><strong>How your time is checked (BPHS Chapter 4 with verses):</strong></p>
              <ul>
                <li>
                  <strong>1) Start from sunrise (Adhyāya 4, Verses 1-3)</strong> — we convert your clock time into ghāṭī/palā units so every few seconds can be tested. Sanskrit source: “दिनकरेणापहतं...” in <em>docs/पराशरहोराशास्त्र Brihat Parashar Hora Shastra _djvu.txt</em>.
                </li>
                <li>
                  <strong>2) Put a marker for Gulika (Adhyāya 4, Verses 1-3)</strong> — the text tells us where Saturn’s portion falls during the day/night; we compute that exact point to use as a purification check.
                </li>
                <li>
                  <strong>3) Build Prāṇapada two ways (Adhyāya 4, Verses 5 &amp; 7)</strong> — “घटी चतुर्गुणा...” (madhya) and “स्वेष्टकालं पलीकृत्य...” (sphuṭa) convert your elapsed palās into a zodiac degree. Your birth lagna must match both.
                </li>
                <li>
                  <strong>4) Keep only human bands (Adhyāya 4, Verse 10)</strong> — “प्राणपदं को राशि से त्रिकोण...” lets humans be only 1st/5th/9th from Prāṇapada; others are filtered out.
                </li>
                <li>
                  <strong>5) Verify purification (Adhyāya 4, Verse 8)</strong> — “विना प्राणपदाच्छुद्धो गुलिकाद्वा निशाकराद्” demands the lagna be purified first by Prāṇapada, else Moon, else Gulika/its 7th.
                </li>
                <li>
                  <strong>6) Show supporting lagnas (Adhyāya 4, Verses 18-28)</strong> — Bhava, Hora, Ghati, and Varnada lagnas are displayed to give context, not to change the BPHS gate results.
                </li>
                <li>
                  <strong>7) Note conception link (Adhyāya 4, Verses 12-16)</strong> — Nisheka lagna is shown so you can trace gestation timing back to the same chapter.
                </li>
              </ul>
              <p className="workflow-note">
                Every step above cites the exact Sanskrit verse and chapter so you can trace your BTR directly to BPHS. Technical math (Swiss Ephemeris) is only used to plug your data into those verse formulas.
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
                    {typeof pobGeocode.tz_offset_hours === 'number' && (
                      <small>Time Zone offset applied: UTC{pobGeocode.tz_offset_hours >= 0 ? '+' : ''}{pobGeocode.tz_offset_hours}</small>
                    )}
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
              {tobMode === 'unknown' && (
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={prashnaMode}
                      onChange={(e) => setPrashnaMode(e.target.checked)}
                    />
                    <strong>Prashna / Query Mode (Nashta Jataka)</strong>
                    <br/>
                    <small style={{fontWeight: 'normal'}}>Use current time/location for chart reconstruction if birth time is completely unknown.</small>
                  </label>
                </div>
              )}
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
                    />
                  </div>
                  <div className="time-input-group">
                    <label htmlFor="override-end" className="time-label">End Time:</label>
                    <input
                      type="time"
                      id="override-end"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                    />
                  </div>
                </div>
                {(overrideStart && overrideEnd) && (
                  <div className="time-range-preview">
                    <small>Custom window: {overrideStart} → {overrideEnd}</small>
                  </div>
                )}
              </div>
            </fieldset>
            <div className="step-actions">
              <div />
              <button className="btn-primary" onClick={handleNext}>Continue to Physical Traits</button>
            </div>
          </div>
        )}

        {currentStep === 'traits' && (
          <div className="step-panel">
            <h2>Phase 2: Physical Traits (BPHS Chapter 2)</h2>
            <p className="step-description">
              Granular physique inputs help the BPHS Chapter 2 descriptors (height/build/complexion) resolve ties between close candidates.
            </p>
            <fieldset>
              <legend>Physical Traits</legend>
              <div className="traits-grid">
                <div>
                  <label title="BPHS 2.6-2.23: body size by lagna rāśi">Height (band + measure):</label>
                  <div className="height-row">
                    <select value={heightBand} onChange={(e) => setHeightBand(e.target.value)}>
                      <option value="">Select band</option>
                      <option value="TALL">Tall (Aries, Taurus, Leo, Capricorn)</option>
                      <option value="MEDIUM">Medium (Gemini, Virgo, Libra, Aquarius, Pisces)</option>
                      <option value="SHORT">Short (Cancer, Scorpio)</option>
                    </select>
                    <select value={heightUnit} onChange={(e) => setHeightUnit(e.target.value as 'cm' | 'ft_in')}>
                      <option value="cm">cm</option>
                      <option value="ft_in">ft/in</option>
                    </select>
                  </div>
                  {heightUnit === 'cm' ? (
                    <input
                      type="number"
                      placeholder="Enter height in cm"
                      value={heightValue}
                      onChange={(e) => setHeightValue(e.target.value)}
                    />
                  ) : (
                    <div className="height-row">
                      <input
                        type="number"
                        placeholder="ft"
                        value={heightFeet}
                        onChange={(e) => setHeightFeet(e.target.value)}
                        min={0}
                      />
                      <input
                        type="number"
                        placeholder="in"
                        value={heightInches}
                        onChange={(e) => setHeightInches(e.target.value)}
                        min={0}
                        step="0.1"
                      />
                    </div>
                  )}
                  <small className="verse-note">BPHS 2.6-2.23: Fixed signs = large, Dual signs = medium, Movable signs = small (except Cancer/Scorpio = short)</small>
                </div>
                <div>
                  <label htmlFor="build" title="BPHS 2.3-2.5: lagnesh and planets in lagna shape the body">Build / Musculature:</label>
                  <select
                    id="build"
                    value={buildBand}
                    onChange={(e) => setBuildBand(e.target.value)}
                  >
                    <option value="">Select build</option>
                    <option value="ATHLETIC">Athletic (Mars/Saturn in lagna)</option>
                    <option value="SLIM">Slim (Mercury/Venus in lagna)</option>
                    <option value="MEDIUM">Medium (Jupiter in lagna)</option>
                    <option value="HEAVY">Heavy (Moon/Saturn aspecting lagna)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Body frame (e.g., broad shoulders, ectomorph)"
                    value={bodyFrame}
                    onChange={(e) => setBodyFrame(e.target.value)}
                  />
                  <small className="verse-note">BPHS 2.3-2.5: Planets in lagna determine build. Mars = muscular, Saturn = heavy, Mercury = slender</small>
                </div>
                <div>
                  <label htmlFor="complexion" title="BPHS 2.5, 2.16: complexion by planets in lagna">Complexion tone:</label>
                  <select
                    id="complexion"
                    value={complexionTone}
                    onChange={(e) => setComplexionTone(e.target.value)}
                  >
                    <option value="">Select complexion</option>
                    <option value="FAIR">Fair (Moon, Venus)</option>
                    <option value="WHEATISH">Wheatish (Jupiter)</option>
                    <option value="REDDISH">Reddish-dark (Sun, Mars)</option>
                    <option value="DARK">Dark (Saturn)</option>
                    <option value="DULL_GREEN">Dull green (Mercury)</option>
                  </select>
                  <small className="verse-note">BPHS 2.5, 2.16: Sun/Mars = reddish, Moon/Venus = fair, Jupiter = yellowish-wheatish, Saturn = dark, Mercury = dull green</small>
                </div>
              </div>
              <div>
                <label htmlFor="trait-notes">Notes (scars, birthmarks, gait):</label>
                <input
                  type="text"
                  id="trait-notes"
                  placeholder="Optional identifiers to break ties"
                  value={traitNotes}
                  onChange={(e) => setTraitNotes(e.target.value)}
                />
              </div>
            </fieldset>
            <div className="step-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Continue to Family Details</button>
            </div>
          </div>
        )}

        {currentStep === 'family' && (
          <div className="step-panel">
            <FamilyStep 
              data={{ events: { siblings, parents } }} 
              updateData={(newData) => {
                if (newData.events?.siblings) setSiblings(newData.events.siblings);
                if (newData.events?.parents) setParents(newData.events.parents);
              }} 
            />
            <div className="step-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Continue to Life Events</button>
            </div>
          </div>
        )}

        {currentStep === 'events' && (
          <div className="step-panel">
            <h2>Phase 3: Life Events (BPHS 4.8 + Dashā timing)</h2>
            <p className="step-description">
              Add dated events to tighten purification and dashā alignment (BPHS Chapter 12) for higher rectification confidence.
            </p>
            <fieldset>
              <legend title="BPHS 4.8 purification anchor + Ch.12 dashā timing">Marriage(s)</legend>
              {marriages.map((m, idx) => (
                <div key={`marriage-${idx}`} className="list-row">
                  <div className="list-row-fields">
                    <input
                      type="date"
                      value={m.date}
                      onChange={(e) => updateMarriageField(idx, 'date', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Place (optional)"
                      value={m.place || ''}
                      onChange={(e) => updateMarriageField(idx, 'place', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Notes (spouse, ceremony type)"
                      value={m.notes || ''}
                      onChange={(e) => updateMarriageField(idx, 'notes', e.target.value)}
                    />
                  </div>
                  {marriages.length > 1 && (
                    <button className="inline-remove" type="button" onClick={() => removeMarriageRow(idx)}>Remove</button>
                  )}
                </div>
              ))}
              <button className="btn-secondary" type="button" onClick={addMarriageRow}>+ Add another marriage</button>
            </fieldset>

            <fieldset>
              <legend title="BPHS 4.8 anchor + Ch.12 Saptamsa timing">Children</legend>
              {children.map((c, idx) => (
                <div key={`child-${idx}`} className="list-row">
                  <div className="list-row-fields">
                    <input
                      type="date"
                      value={c.date}
                      onChange={(e) => updateChildField(idx, 'date', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Notes (gender, complications)"
                      value={c.notes || ''}
                      onChange={(e) => updateChildField(idx, 'notes', e.target.value)}
                    />
                  </div>
                  {children.length > 1 && (
                    <button className="inline-remove" type="button" onClick={() => removeChildRow(idx)}>Remove</button>
                  )}
                </div>
              ))}
              <button className="btn-secondary" type="button" onClick={addChildRow}>+ Add child</button>
            </fieldset>

            <fieldset>
              <legend title="BPHS Ch.12 D10 career timing">Career Milestones</legend>
              {careerEvents.map((c, idx) => (
                <div key={`career-${idx}`} className="list-row">
                  <div className="list-row-fields">
                    <input
                      type="date"
                      value={c.date}
                      onChange={(e) => updateCareerField(idx, 'date', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Role or promotion"
                      value={c.role || ''}
                      onChange={(e) => updateCareerField(idx, 'role', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={c.description || ''}
                      onChange={(e) => updateCareerField(idx, 'description', e.target.value)}
                    />
                  </div>
                  {careerEvents.length > 1 && (
                    <button className="inline-remove" type="button" onClick={() => removeCareerRow(idx)}>Remove</button>
                  )}
                </div>
              ))}
              <button className="btn-secondary" type="button" onClick={addCareerRow}>+ Add career event</button>
            </fieldset>

            <fieldset>
              <legend title="BPHS 4.8 + Ch.12 major dashā triggers (health/relocation/awards)">Major Life Events (health, relocations, awards)</legend>
              {majorEvents.map((m, idx) => (
                <div key={`major-${idx}`} className="list-row">
                  <div className="list-row-fields">
                    <input
                      type="date"
                      value={m.date}
                      onChange={(e) => updateMajorField(idx, 'date', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={m.title}
                      onChange={(e) => updateMajorField(idx, 'title', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={m.description || ''}
                      onChange={(e) => updateMajorField(idx, 'description', e.target.value)}
                    />
                  </div>
                  {majorEvents.length > 1 && (
                    <button className="inline-remove" type="button" onClick={() => removeMajorRow(idx)}>Remove</button>
                  )}
                </div>
              ))}
              <button className="btn-secondary" type="button" onClick={addMajorRow}>+ Add major event</button>
            </fieldset>

            <div className="step-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleNext}>Continue to Review</button>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="step-panel">
            <h2>Review & Submit</h2>
            <p className="step-description">
              Confirm the details align with BPHS rectification steps before submitting.
            </p>
            <div className="review-section">
              <h3>Required Details</h3>
              <dl>
                <dt>Date of Birth</dt>
                <dd>{dob}</dd>
                <dt>Place of Birth</dt>
                <dd>{pobGeocode ? `${pobGeocode.formatted} (${pobGeocode.lat.toFixed(4)}, ${pobGeocode.lon.toFixed(4)})` : pob}</dd>
                <dt>Approx TOB Mode</dt>
                <dd>{tobMode === 'approx' ? `${tobCenter} ± ${tobWindow}h` : 'Unknown (full day search)'}</dd>
                {overrideStart && overrideEnd && (
                  <>
                    <dt>Override Window</dt>
                    <dd>{overrideStart} → {overrideEnd}</dd>
                  </>
                )}
              </dl>
            </div>
            <div className="review-section">
              <h3>Physical Traits</h3>
              <dl>
                <dt>Height</dt>
                <dd>{heightBand || heightValue || heightFeet
                  ? `${heightBand || ''} ${heightUnit === 'cm' ? (heightValue ? `${heightValue} cm` : '') : `${heightFeet || 0}ft ${heightInches || 0}in`}`.trim()
                  : <em>Not provided</em>}</dd>
                <dt>Build</dt>
                <dd>{buildBand || bodyFrame || <em>Not provided</em>}</dd>
                <dt>Complexion</dt>
                <dd>{complexionTone || <em>Not provided</em>}</dd>
                <dt>Notes</dt>
                <dd>{traitNotes || <em>Not provided</em>}</dd>
              </dl>
            </div>
            <div className="review-section">
              <h3>Life Events</h3>
              <dl>
                <dt>Marriages</dt>
                <dd>{marriages.some((m) => m.date) ? marriages.filter((m) => m.date).map((m, idx) => `#${idx + 1} ${m.date}${m.place ? ` @ ${m.place}` : ''}`).join('; ') : <em>Not provided</em>}</dd>
                <dt>Children</dt>
                <dd>{children.some((c) => c.date) ? children.filter((c) => c.date).map((c, idx) => `#${idx + 1} ${c.date}`).join('; ') : <em>Not provided</em>}</dd>
                <dt>Career Milestones</dt>
                <dd>{careerEvents.some((c) => c.date) ? careerEvents.filter((c) => c.date).map((c) => c.date).join(', ') : <em>Not provided</em>}</dd>
                <dt>Major Events</dt>
                <dd>{majorEvents.some((m) => m.date) ? majorEvents.filter((m) => m.date).map((m) => `${m.title}: ${m.date}`).join('; ') : <em>Not provided</em>}</dd>
              </dl>
            </div>
            <div className="step-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button className="btn-primary" onClick={handleSubmit}>Submit for BPHS Rectification</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
