import { useState } from 'react';
import type { BTRRequest, PhysicalTraits, LifeEvents } from '../types';
import './BTRForm.css';

interface BTRFormProps {
  onSubmit: (request: BTRRequest) => void;
}

export function BTRForm({ onSubmit }: BTRFormProps) {
  const [dob, setDob] = useState('');
  const [pob, setPob] = useState('');
  const [tzOffset, setTzOffset] = useState(5);
  const [tzCustom, setTzCustom] = useState(false);
  const [tobMode, setTobMode] = useState<'unknown' | 'approx'>('unknown');
  const [tobCenter, setTobCenter] = useState('12:00');
  const [tobWindow, setTobWindow] = useState(3.0);
  const [overrideStart, setOverrideStart] = useState('');
  const [overrideEnd, setOverrideEnd] = useState('');
  
  // Physical traits
  const [height, setHeight] = useState('');
  const [build, setBuild] = useState('');
  const [complexion, setComplexion] = useState('');
  
  // Life events
  const [marriageDate, setMarriageDate] = useState('');
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenDates, setChildrenDates] = useState<string[]>([]);
  const [careerEvents, setCareerEvents] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!dob || !dob.trim()) {
      alert('Please enter a date of birth');
      return;
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dob)) {
      alert('Date of birth must be in YYYY-MM-DD format');
      return;
    }
    
    if (!pob || !pob.trim()) {
      alert('Please enter a place of birth');
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

    // Ensure tzOffset is a valid number
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

  return (
    <form onSubmit={handleSubmit} className="btr-form">
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
          <small>Example: Sialkot, Pakistan</small>
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
            <input
              type="time"
              id="override-start"
              value={overrideStart}
              onChange={(e) => setOverrideStart(e.target.value)}
              placeholder="Start"
            />
            <span>to</span>
            <input
              type="time"
              id="override-end"
              value={overrideEnd}
              onChange={(e) => setOverrideEnd(e.target.value)}
              placeholder="End"
            />
          </div>
          <small>If provided, overrides approximate time settings</small>
        </div>
      </fieldset>

      <fieldset>
        <legend>Optional: Physical Traits (for verification)</legend>
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
        <legend>Optional: Life Events (for verification)</legend>
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
              if (count > childrenDates.length) {
                setChildrenDates([...childrenDates, ...Array(count - childrenDates.length).fill('')]);
              } else {
                setChildrenDates(childrenDates.slice(0, count));
              }
            }}
          />
        </div>
        {childrenCount > 0 && (
          <div className="children-dates-container">
            <label>Children Birth Dates:</label>
            {Array.from({ length: childrenCount }).map((_, i) => (
              <div key={i} className="child-date-input">
                <label>Child {i + 1} Birth Date:</label>
                <input
                  type="date"
                  value={childrenDates[i] || ''}
                  onChange={(e) => updateChildrenDates(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
        <div>
          <label htmlFor="career-events">Major Career Events (comma-separated dates):</label>
          <input
            type="text"
            id="career-events"
            value={careerEvents}
            onChange={(e) => setCareerEvents(e.target.value)}
            placeholder="YYYY-MM-DD, YYYY-MM-DD"
          />
          <small>First job, promotions, job changes, etc.</small>
        </div>
      </fieldset>

      <button type="submit">Calculate BTR</button>
    </form>
  );
}

