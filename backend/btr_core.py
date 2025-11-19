# BTR Core module

"""Core BPHS-based Birth Time Rectification utilities.

This module implements the astronomical and astrological calculations required
by the Birth Time Rectification (BTR) pipeline described in the BPHS verses.
Only rules explicitly appearing in Chapter 4 of Brihat Parāśara Horā Śāstra
are used here.  See `Birth-Time-Rectification-Verses.md` for the authoritative
verse translations on which these functions are based.

Important: All longitudes returned by these functions are sidereal (Lahiri),
not tropical. Swiss Ephemeris is used for high‑precision planetary positions,
sunrise/sunset, and house cusps.
"""

import math
import datetime
import logging
from typing import Optional, Any

import swisseph as swe

from . import config

logger = logging.getLogger("btr.core")

# Configure Swiss Ephemeris for sidereal calculations at import time
if config.EPHE_PATH:
    swe.set_ephe_path(config.EPHE_PATH)
# Set Lahiri ayanamsa for sidereal zodiac
swe.set_sid_mode(swe.SIDM_LAHIRI)

# Default strict BPHS orb (in degrees) for Gulika/Moon alignments
# 1° keeps alignments tight while avoiding false negatives at palā resolution.
STRICT_ORB_TOLERANCE = 1.0

# Palā resolution for Prāṇa‑pada equality (BPHS 4.6, lines 1013–1019)
PALA_DEGREES = 2.0  # 1 pala of Prana‑pada = 2°
VIPALA_DEGREES = PALA_DEGREES / 60.0  # 1 vipala = 1/60 pala
# Default tolerance: 1 palā (2°) resolution; strict mode: ~1/10 palā (~0.2°)
PADA_EPSILON_DEGREES = PALA_DEGREES
STRICT_PADA_EPSILON_DEGREES = PALA_DEGREES / 10.0
# Time resolution: 1 palā = 24 seconds (BPHS traditional unit)
PALA_SECONDS = 24.0
# Runtime safety cap for palā-by-palā śodhana adjustments (150 palās ≈ 60 minutes)
MAX_RUNTIME_SHODHANA_PALAS = 150

# Enhanced constants for palā-level precision 
FULL_DAY_PALAS = 720  # 24 hours × 60 minutes ÷ 2 minutes = 720 palās (full day)
PALA_LEVEL_SHODHANA_PALAS = 720  # Full-day palā shodhana for ultra-precise timing

# Mapping of weekday index (0=Sunday) to its ruling planet in the classical
# sequence used by BPHS.  Indices correspond to the order of the seven days.
_PLANET_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

def _weekday_index(py_weekday: int) -> int:
    """Convert Python weekday (Monday=0) to BPHS weekday index (Sunday=0).

    Args:
        py_weekday: Python weekday where Monday=0, Sunday=6.

    Returns:
        int: An index 0–6 where 0=Sunday, 1=Monday, …, 6=Saturday.
    """
    return (py_weekday + 1) % 7

def _datetime_to_jd_ut(dt: datetime.datetime, tz_offset: float) -> float:
    """Convert a naive local datetime into a Julian Day in UT.

    Args:
        dt: Local naive datetime (no tzinfo).
        tz_offset: Offset from UTC in hours (e.g. +5.5 for IST).

    Returns:
        float: Julian day number in UT.
    """
    # Convert local time to UTC by subtracting the offset
    dt_utc = dt - datetime.timedelta(hours=tz_offset)
    day_fraction = (dt_utc.hour +
                    dt_utc.minute / 60.0 +
                    dt_utc.second / 3600.0 +
                    dt_utc.microsecond / 3_600_000_000.0)
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, day_fraction)

def _jd_to_datetime_local(jd_ut: float, tz_offset: float) -> datetime.datetime:
    """Convert a Julian Day in UT to a local naive datetime.

    Args:
        jd_ut: The Julian Day in UT.
        tz_offset: Offset from UTC in hours.

    Returns:
        datetime.datetime: Local naive datetime.
    """
    year, month, day, hour = swe.revjul(jd_ut)
    dt_utc = datetime.datetime(year, month, day) + datetime.timedelta(hours=hour)
    return dt_utc + datetime.timedelta(hours=tz_offset)

def compute_sidereal_lagna(jd_ut: float, latitude: float, longitude: float) -> float:
    """Compute the sidereal ascendant (lagna) in degrees.

    Uses Swiss Ephemeris house calculation to obtain the ascendant.  The
    sidereal ayanamsa has already been set globally.

    Args:
        jd_ut: Julian Day in UT.
        latitude: Geographic latitude (north positive) in degrees.
        longitude: Geographic longitude (east positive) in degrees.

    Returns:
        float: Ascendant longitude in degrees (0–360).
    
    Raises:
        RuntimeError: If Swiss Ephemeris calculation fails.
    """
    try:
        cusp, ascmc = swe.houses(jd_ut, latitude, longitude)
        asc = ascmc[0]
        if not isinstance(asc, (int, float)) or math.isnan(asc) or math.isinf(asc):
            raise RuntimeError(f"Swiss Ephemeris returned invalid ascendant value: {asc}")
        return asc % 360.0
    except Exception as e:
        raise RuntimeError(f"Swiss Ephemeris house calculation failed: {e}") from e

def compute_sun_moon_longitudes(jd_ut: float) -> tuple[float, float]:
    """Compute the sidereal longitudes of the Sun and Moon.

    Args:
        jd_ut: Julian Day in UT.

    Returns:
        tuple[float, float]: (sun_longitude, moon_longitude) in degrees.
    
    Raises:
        RuntimeError: If Swiss Ephemeris calculation fails.
    """
    try:
        ayan = swe.get_ayanamsa_ut(jd_ut)
        if not isinstance(ayan, (int, float)) or math.isnan(ayan) or math.isinf(ayan):
            raise RuntimeError(f"Swiss Ephemeris returned invalid ayanamsa: {ayan}")
        
        sun_result = swe.calc_ut(jd_ut, swe.SUN)
        if sun_result[1] < 0:
            raise RuntimeError(f"Swiss Ephemeris Sun calculation failed with error code: {sun_result[1]}")
        sun_longitude = (sun_result[0][0] - ayan) % 360.0
        
        moon_result = swe.calc_ut(jd_ut, swe.MOON)
        if moon_result[1] < 0:
            raise RuntimeError(f"Swiss Ephemeris Moon calculation failed with error code: {moon_result[1]}")
        moon_longitude = (moon_result[0][0] - ayan) % 360.0
        
        if math.isnan(sun_longitude) or math.isinf(sun_longitude):
            raise RuntimeError(f"Invalid sun longitude: {sun_longitude}")
        if math.isnan(moon_longitude) or math.isinf(moon_longitude):
            raise RuntimeError(f"Invalid moon longitude: {moon_longitude}")
        
        return sun_longitude, moon_longitude
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Swiss Ephemeris planet calculation failed: {e}") from e

def get_planet_positions(jd_ut: float) -> dict[str, float]:
    """Get all planet positions (sidereal, Lahiri ayanamsa).
    
    Args:
        jd_ut: Julian Day in UT.
        
    Returns:
        Dict with keys: 'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'
    
    Raises:
        RuntimeError: If Swiss Ephemeris calculation fails.
    """
    try:
        ayan = swe.get_ayanamsa_ut(jd_ut)
        if not isinstance(ayan, (int, float)) or math.isnan(ayan) or math.isinf(ayan):
            raise RuntimeError(f"Swiss Ephemeris returned invalid ayanamsa: {ayan}")
        
        positions = {}
        
        planets = {
            'sun': swe.SUN,
            'moon': swe.MOON,
            'mars': swe.MARS,
            'mercury': swe.MERCURY,
            'jupiter': swe.JUPITER,
            'venus': swe.VENUS,
            'saturn': swe.SATURN,
            'rahu': swe.MEAN_NODE
        }
        
        for name, planet_id in planets.items():
            calc_result = swe.calc_ut(jd_ut, planet_id)
            if calc_result[1] < 0:
                raise RuntimeError(f"Swiss Ephemeris {name} calculation failed with error code: {calc_result[1]}")
            calc = calc_result[0]
            longitude = (calc[0] - ayan) % 360.0
            if math.isnan(longitude) or math.isinf(longitude):
                raise RuntimeError(f"Invalid {name} longitude: {longitude}")
            positions[name] = longitude
        
        # Ketu is 180° from Rahu
        positions['ketu'] = (positions['rahu'] + 180.0) % 360.0
        
        return positions
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Swiss Ephemeris planet positions calculation failed: {e}") from e

def compute_sunrise_sunset(date_local: datetime.date,
                           latitude: float,
                           longitude: float,
                           tz_offset: float) -> tuple[datetime.datetime, datetime.datetime]:
    """Compute the local sunrise and sunset times for a given date and location.

    The BPHS Gulika calculation requires accurate day and night durations.
    This function uses Swiss Ephemeris’s rise/transit function to determine
    the times of the Sun’s rising and setting relative to the local horizon,
    with the solar disc’s centre.

    Args:
        date_local: The calendar date in the local time zone.
        latitude: Geographic latitude (north positive) in degrees.
        longitude: Geographic longitude (east positive) in degrees.
        tz_offset: Local time zone offset from UTC in hours.

    Returns:
        tuple[datetime.datetime, datetime.datetime]: (sunrise_local, sunset_local)
    """
    # Anchor the search at local noon to keep the requested civil date centered,
    # avoiding Swiss Ephemeris returning the previous day's rise/set when time
    # zones are far from UTC.
    dt_anchor_local = datetime.datetime.combine(date_local, datetime.time(12, 0))
    jd_anchor_ut = _datetime_to_jd_ut(dt_anchor_local, tz_offset)

    def _rise_set_local(flag: int, anchor_jd: float) -> datetime.datetime:
        res, tret = swe.rise_trans(
            anchor_jd,
            swe.SUN,
            flag | swe.BIT_DISC_CENTER,
            (longitude, latitude, 0.0),
            0.0,
            0.0
        )
        if res < 0:
            raise RuntimeError(f"Swiss Ephemeris failed to compute {'rise' if flag & swe.CALC_RISE else 'set'} (error {res})")
        return _jd_to_datetime_local(tret[0], tz_offset)

    def _resolve_event(flag: int, label: str) -> datetime.datetime:
        # Primary attempt centered on the requested date
        candidate_dt = _rise_set_local(flag, jd_anchor_ut)
        if candidate_dt.date() == date_local:
            return candidate_dt

        # If Swiss Ephemeris returns a neighbor day (e.g., previous day due to offset),
        # retry with neighboring anchors to force the correct civil date.
        for delta_day in (1.0, -1.0):
            adjusted_dt = _rise_set_local(flag, jd_anchor_ut + delta_day)
            if adjusted_dt.date() == date_local:
                return adjusted_dt

        raise RuntimeError(
            f"Could not resolve {label} for local date {date_local}; last result was {candidate_dt.date()}"
        )

    sunrise_local = _resolve_event(swe.CALC_RISE, "sunrise")
    sunset_local = _resolve_event(swe.CALC_SET, "sunset")

    return sunrise_local, sunset_local

def calculate_gulika(date_local: datetime.date,
                     latitude: float,
                     longitude: float,
                     tz_offset: float) -> dict[str, float]:
    """Calculate Gulika-lagna for the given date and location.

    BPHS Verses 4.1-4.3: Gulika Calculation (गुलिक गणना)
    
    Verse 4.1:
    रविवारादिशन्यन्तं गुलिकादि निरूप्यते।
    दिवसानष्टधा कृत्वा वारेशाद्मणयेत््रमात्।
    "From Sunday to Saturday, Gulika etc. are determined.
    Divide the day duration into 8 parts; count from the weekday lord."
    
    Verse 4.2:
    अष्छ्मषो निरीशः स्याच्छन्यंशो गुरिकः स्मृतः।
    रात्रिरष्यष्टधा भक्त्वा वःरर््पञ्चनादतः।
    "The 8th portion has no lord (Niresha); Saturn's portion is called Gulika.
    Similarly for night births, divide night duration into 8 parts 
    and count from the 5th weekday lord."
    
    Verse 4.3:
    शन्यशो गुलिकः प्रोक्तो गुर्वंशो यमघण्टकः।
    "Saturn's portion = Gulika, Jupiter's portion = Yamaghantaka."

    Gulika is an upagraha defined as Saturn's segment of the day or night
    divided into eight equal parts.  The day sequence starts from the
    weekday lord of the date (Sunday=Sun, Monday=Moon, …), while the night
    sequence starts from the planet ruling the fifth weekday from the date.

    Returns a dictionary containing the gulika ascendant in degrees for the
    daytime and nighttime segments, along with the segment start‑times in
    local time for debugging.

    Args:
        date_local: Calendar date in local time zone.
        latitude: Geographic latitude (north positive).
        longitude: Geographic longitude (east positive).
        tz_offset: Hours offset from UTC.

    Returns:
        dict[str, float]: {
            'day_gulika_deg': float,
            'night_gulika_deg': float,
            'day_gulika_time_local': datetime.datetime,
            'night_gulika_time_local': datetime.datetime
        }
    """
    sunrise_local, sunset_local = compute_sunrise_sunset(date_local, latitude, longitude, tz_offset)
    # Next day's sunrise for night calculations
    next_day = date_local + datetime.timedelta(days=1)
    next_sunrise_local, _ = compute_sunrise_sunset(next_day, latitude, longitude, tz_offset)

    # Daytime gulika (BPHS Verse 4.1)
    # Divide day duration into 8 equal parts (khandas)
    # Count from weekday lord: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
    # The 8th khanda has no lord (Niresha) per BPHS 4.2
    # Saturn's khanda = Gulika period
    day_duration = (sunset_local - sunrise_local).total_seconds()
    day_segment = day_duration / 8.0
    weekday_idx = _weekday_index(date_local.weekday())
    # Planet sequence: Sun(0), Moon(1), Mars(2), Mercury(3), Jupiter(4), Venus(5), Saturn(6)
    # Starting from weekday lord, find Saturn's position in the sequence
    # Saturn's index in the full sequence is 6
    # We need to find which khanda (0-7) corresponds to Saturn
    # If weekday lord is at position W in sequence [0,1,2,3,4,5,6], then:
    # Khanda 0 = weekday lord (position W)
    # Khanda 1 = next planet (position (W+1)%7)
    # ...
    # Khanda 6 = Saturn (position 6)
    # So we need: (W + khanda_index) % 7 == 6
    # khanda_index = (6 - W) % 7
    gulika_khanda_index = (6 - weekday_idx) % 7
    # Note: (6 - weekday_idx) % 7 will always give 0-6, never 7
    # Khanda 7 (8th khanda) has no lord (Niresha) per BPHS 4.2
    # If Saturn would fall on khanda 7, it should be on khanda 6 instead
    # However, since we have 7 planets and 8 khandas, Saturn can occupy khandas 0-6
    # The formula (6 - weekday_idx) % 7 correctly identifies Saturn's khanda
    gulika_day_start = sunrise_local + datetime.timedelta(seconds=day_segment * gulika_khanda_index)
    # BPHS 4.1-4.3: Treat Saturn's khanda itself as the Gulika ishta‑kāla.
    # Use the Saturn segment boundary (start) rather than midpoint.
    jd_gulika_day = _datetime_to_jd_ut(gulika_day_start, tz_offset)
    day_gulika_deg = compute_sidereal_lagna(jd_gulika_day, latitude, longitude)

    # Nighttime gulika (BPHS Verse 4.2)
    # For night births: divide night duration into 8 parts
    # Count from 5th weekday lord (not the day's weekday lord)
    night_duration = (next_sunrise_local - sunset_local).total_seconds()
    night_segment = night_duration / 8.0
    # 5th weekday lord from current weekday (weekday_idx + 4) % 7
    night_start_weekday_idx = (weekday_idx + 4) % 7
    # Find Saturn's khanda from the night start weekday lord
    # Same sequence: starting from 5th weekday lord, find Saturn's position
    gulika_night_khanda_index = (6 - night_start_weekday_idx) % 7
    gulika_night_start = sunset_local + datetime.timedelta(seconds=night_segment * gulika_night_khanda_index)
    jd_gulika_night = _datetime_to_jd_ut(gulika_night_start, tz_offset)
    night_gulika_deg = compute_sidereal_lagna(jd_gulika_night, latitude, longitude)

    return {
        'day_gulika_deg': day_gulika_deg,
        'night_gulika_deg': night_gulika_deg,
        'day_gulika_time_local': gulika_day_start,
        'night_gulika_time_local': gulika_night_start
    }

def calculate_ishta_kala(candidate_local: datetime.datetime,
                         sunrise_local: datetime.datetime) -> tuple[int, int, float]:
    """Compute the Ishta‑kāla between sunrise and the candidate time.

    BPHS Reference: Required for Pranapada calculation (Verses 4.5, 4.7)
    
    Ishta‑kāla is the elapsed time since local sunrise expressed in
    traditional units: ghāṭis and palās.  One day comprises 60 ghāṭis;
    each ghāṭi comprises 60 palās; each palā is 24 seconds.
    
    This is the fundamental time unit used in BPHS BTR calculations.

    Args:
        candidate_local: The candidate birth time (local naive datetime).
        sunrise_local: The local sunrise time (naive datetime).

    Returns:
        tuple[int, int, float]: (ghatis, palas, total_palas)
    """
    delta_sec = (candidate_local - sunrise_local).total_seconds()
    if delta_sec < 0:
        delta_sec += 24 * 3600.0
    total_palas = delta_sec / 24.0
    ghatis = int(total_palas // 60)
    palas = int(total_palas % 60)
    return ghatis, palas, total_palas

def calculate_madhya_pranapada(ghatis: int, palas: int) -> float:
    """Compute Madhya Prāṇa‑pada longitude from ghāṭis and palās (BPHS 4.5).

    BPHS Verse 4.5:
    घटी चतुर्गुणा कार्यां तिथ्याप्तैश्च पलैर्युताः।
    दिनकरेणापहतं शेषं प्राणपदं स्मृतम्।

    Formula:
        1. Multiply the number of ghāṭis by 4.
        2. Divide the palās by 15 (take quotient).
        3. Add these two.
        4. Divide the sum by 12; remainder is the rāśi number.
        5. Multiply the remainder by 2 to get degrees within the rāśi.

    Args:
        ghatis: Number of ghāṭis elapsed since sunrise.
        palas: Number of palās (within current ghāṭi).

    Returns:
        float: Prāṇa‑pada longitude in degrees (0–360).
    """
    # BPHS Verse 4.5 Formula Implementation:
    # घटी चतुर्गुणा कार्यां तिथ्याप्तैश्च पलैर्युताः।
    # दिनकरेणापहतं शेषं प्राणपदं स्मृतम्।
    
    # Step 1: Multiply ghatis by 4 (घटी चतुर्गुणा)
    part1 = ghatis * 4
    
    # Step 2: Divide palas by 15, take quotient (तिथ्याप्तैश्च पलैर्युताः)
    pala_quotient = palas // 15
    
    # Step 3: Add both values
    total = part1 + pala_quotient
    
    # Step 4: Divide by 12, remainder is rashi (दिनकरेणापहतं शेषं)
    rashi_index = total % 12
    
    # Step 5: Remainder from palas ÷ 15, multiplied by 2 for degrees
    # Per BPHS 4.6: "Double the remainder to get degrees" (शेषात्यलान्तादिहवगुणी)
    pala_remainder = palas % 15
    degrees = pala_remainder * 2.0
    
    # Convert to absolute longitude
    longitude = (rashi_index * 30.0) + degrees
    return longitude % 360.0

def calculate_sphuta_pranapada(ishta_total_palas: float,
                               sun_longitude: float) -> float:
    """Compute Sphuṭa Prāṇa‑pada longitude (BPHS 4.7).

    BPHS Verse 4.7:
    अथच--स्वेष्टकालं पलीकृत्य तिथ्याप्तं भादिकं च यत्।
    चरागद्विभके भानौ योज्यं स्वे नवमे सुते।
    स्फुट प्राणपदं तस्मात् पूर्ववच्छोधयेत्तनुम्।

    Method:
        1. Divide the full Ishta‑kāla (in palās) by 15 to obtain a rāśi fraction.
           Every 15 palās correspond to one zodiac sign (30°).
        2. Determine the nature of the Sun's sign:
           - Chara (Movable): 0,3,6,9 (Aries, Cancer, Libra, Capricorn)
           - Sthira (Fixed): 1,4,7,10 (Taurus, Leo, Scorpio, Aquarius)
           - Dvisvabhava (Dual): 2,5,8,11 (Gemini, Virgo, Sagittarius, Pisces)
        3. Add this rāśi fraction to:
           - the Sun's own sign if Chara (movable),
           - the 9th sign from the Sun if Sthira (fixed),
           - the 5th sign from the Sun if Dvisvabhava (dual).
        4. Convert the resulting sign and fraction to absolute longitude.

    Args:
        ishta_total_palas: Total palās elapsed since sunrise.
        sun_longitude: The Sun's sidereal longitude in degrees.

    Returns:
        float: The Sphuṭa Prāṇa‑pada longitude in degrees (0–360).
    """
    # BPHS Verse 4.7 Formula Implementation:
    # स्वेष्टकालं पलीकृत्य तिथ्याप्तं भादिकं च यत्।
    # चरागद्विभके भानौ योज्यं स्वे नवमे सुते।
    
    # Step 1: Convert Ishta Kala to palas, divide by 15 to get rashi fraction
    # Every 15 palas = 1 rashi (30 degrees) - तिथ्याप्तं भादिकं
    rashi_fraction = ishta_total_palas / 15.0
    
    # Separate into whole rashis and fractional part
    sign_offset = int(math.floor(rashi_fraction))
    fraction_of_sign = rashi_fraction - sign_offset
    
    # Step 2: Determine Sun's rashi and its nature (चरागद्विभके भानौ)
    sun_sign = int(math.floor(sun_longitude / 30.0)) % 12
    nature_mod = sun_sign % 3
    
    # Step 3: Determine base sign based on Sun's nature per BPHS 4.7
    if nature_mod == 0:
        # Chara (Movable): Add to Sun's own sign (स्वे)
        # Signs: Aries(0), Cancer(3), Libra(6), Capricorn(9)
        base_sign = sun_sign
    elif nature_mod == 1:
        # Sthira (Fixed): Add to 9th from Sun (नवमे)
        # Signs: Taurus(1), Leo(4), Scorpio(7), Aquarius(10)
        base_sign = (sun_sign + 8) % 12  # 9th = +8 mod 12
    else:  # nature_mod == 2
        # Dvisvabhava (Dual): Add to 5th from Sun (सुते)
        # Signs: Gemini(2), Virgo(5), Sagittarius(8), Pisces(11)
        base_sign = (sun_sign + 4) % 12  # 5th = +4 mod 12
    
    # Step 4: Add the rashi offset and convert to absolute longitude
    final_sign = (base_sign + sign_offset) % 12
    final_deg_in_sign = fraction_of_sign * 30.0
    longitude = (final_sign * 30.0 + final_deg_in_sign) % 360.0
    
    return longitude

def calculate_special_lagnas(ishta_kala: tuple[int, int, float],
                             sun_longitude: float,
                             janma_lagna_deg: float) -> dict[str, float]:
    """Calculate special lagnas per BPHS Verses 4.18-28.
    
    Calculates:
    1. Bhava Lagna (Verse 4.18): Every 5 ghatis = 1 sign progression
    2. Hora Lagna (Verses 4.20-21): Every 2.5 ghatis = 1 sign progression
    3. Ghati Lagna (Verses 4.22-24): 1 ghati = 1 sign, 1 pala = 2 degrees
    4. Varnada Lagna (Verses 4.26-28): Complex calculation from Janma + Hora lagnas
    
    Args:
        ishta_kala: Tuple of (ghatis, palas, total_palas)
        sun_longitude: Sun's sidereal longitude in degrees
        janma_lagna_deg: Birth ascendant longitude in degrees
        
    Returns:
        Dict with keys: 'bhava_lagna', 'hora_lagna', 'ghati_lagna', 'varnada_lagna'
    """
    ghatis, palas, total_palas = ishta_kala
    
    # 1. BHAVA LAGNA (BPHS Verse 4.18)
    # सूर्योदयात्समारभ्य घटीपञ्च प्रमाणतः।
    # जन्मेष्टकालपर्यन्तं गणनीयं प्रयत्नतः।
    # "From sunrise, every 5 ghatis equals one lagna progressing."
    # Every 5 ghatis = 1 sign progression from Sun
    bhava_offset_rashis = ghatis / 5.0
    bhava_lagna = (sun_longitude + (bhava_offset_rashis * 30.0)) % 360.0
    
    # 2. HORA LAGNA (BPHS Verses 4.20-21)
    # सार्धद्विष्ठटिक्छा विप्र कालादिति विलग्नभात्।
    # "Every 2.5 ghatis = one Hora Lagna progression."
    # Every 2.5 ghatis = 1 sign progression from Sun
    hora_offset_rashis = ghatis / 2.5
    hora_lagna = (sun_longitude + (hora_offset_rashis * 30.0)) % 360.0
    
    # 3. GHATI LAGNA (BPHS Verses 4.22-24)
    # सूर्योदयात्समारभ्य जन्मकालावधि क्रमात्।
    # एकैकं घटिकांमानांल्लग्नं राश्यादिकं च यत्।
    # राशीन् तत्र घटीतुल्या दहिभागाः पलसम्मिताः।
    # "From sunrise to birth time, every 1 ghati = 1 sign progression.
    # 1 ghati = 1 rashi; 1 pala = 2 degrees."
    ghati_offset_deg = (ghatis * 30.0) + (palas * 2.0)
    ghati_lagna = (sun_longitude + ghati_offset_deg) % 360.0
    
    # 4. VARNADA LAGNA (BPHS Verses 4.26-28)
    # जन्महोराख्यलग्नक्षसंख्या ग्राह्या पृथक् पृथक्।
    # ओजे लग्ने त्वेकयुग्मे चक्रशुद्धैकसंयुता।
    # "Take Janma Lagna and Hora Lagna separately.
    # If both odd or both even: Add them.
    # If one odd, one even: Subtract (with adjustments).
    # Result is always an ODD sign."
    janma_rashi_num = int(math.floor(janma_lagna_deg / 30.0)) + 1  # 1-12
    hora_rashi_num = int(math.floor(hora_lagna / 30.0)) + 1
    
    janma_odd = (janma_rashi_num % 2 == 1)
    hora_odd = (hora_rashi_num % 2 == 1)
    
    if janma_odd == hora_odd:
        # Both odd or both even: Add
        varnada_num = janma_rashi_num + hora_rashi_num
        if varnada_num > 12:
            varnada_num = varnada_num % 12
            if varnada_num == 0:
                varnada_num = 12
        # Ensure result is odd
        if varnada_num % 2 == 0:
            varnada_num = 12 - varnada_num
            if varnada_num == 0:
                varnada_num = 1
    else:
        # One odd, one even: Subtract
        if hora_rashi_num % 2 == 0:
            # Convert even to odd equivalent for calculation
            hora_adjusted = 13 - hora_rashi_num
        else:
            hora_adjusted = hora_rashi_num
        varnada_num = abs(janma_rashi_num - hora_adjusted)
        if varnada_num == 0:
            varnada_num = 1
        # Ensure result is odd
        if varnada_num % 2 == 0:
            varnada_num = 12 - varnada_num
            if varnada_num == 0:
                varnada_num = 1
    
    varnada_lagna = ((varnada_num - 1) * 30.0) % 360.0
    
    return {
        'bhava_lagna': bhava_lagna,
        'hora_lagna': hora_lagna,
        'ghati_lagna': ghati_lagna,
        'varnada_lagna': varnada_lagna
    }

def calculate_nisheka_lagna(saturn_deg: float,
                             gulika_lagna_deg: float,
                             janma_lagna_deg: float) -> dict[str, Any]:
    """Calculate Nisheka (Conception) Lagna per BPHS Verses 4.12-16.
    
    BPHS Verse 4.14:
    यस्मिन् भावे स्थितो कोणस्तस्य मान्देर्यदन्तरम्।
    लग्नभाग्यन्तरं योज्यं यच्च राश्यादि जायते।
    
    Formula:
    1. Saturn's house - Gulika lagna = Diff A (मान्देर्यदन्तरम्)
    2. Lagna - 9th house = Diff B (लग्नभाग्यन्तरं)
    3. Diff A + Diff B = Gestation period (in rashis, roughly months)
    
    This calculates the conception time (Nisheka) and verifies gestation period.
    
    Args:
        saturn_deg: Saturn's sidereal longitude in degrees
        gulika_lagna_deg: Gulika lagna longitude in degrees
        janma_lagna_deg: Birth ascendant longitude in degrees
        
    Returns:
        Dict with keys: 'nisheka_lagna_deg', 'gestation_months', 'is_realistic', 'gestation_score'
    """
    saturn_rashi = int(math.floor(saturn_deg / 30.0)) % 12
    gulika_rashi = int(math.floor(gulika_lagna_deg / 30.0)) % 12
    lagna_rashi = int(math.floor(janma_lagna_deg / 30.0)) % 12
    
    # Difference A: Saturn rashi - Gulika rashi (BPHS 4.14: मान्देर्यदन्तरम्)
    diff_a = (saturn_rashi - gulika_rashi) % 12
    
    # Difference B: Lagna rashi - 9th house rashi (BPHS 4.14: लग्नभाग्यन्तरं)
    # 9th house = lagna + 8 signs
    ninth_house_rashi = (lagna_rashi + 8) % 12
    diff_b = (lagna_rashi - ninth_house_rashi) % 12
    
    # Total = Gestation period (in rashis, roughly months)
    total_rashis = (diff_a + diff_b) % 12
    if total_rashis == 0:
        total_rashis = 12
    
    gestation_months = float(total_rashis)
    
    # Realistic gestation: 5-10.5 months (150-320 days)
    is_realistic = 5.0 <= gestation_months <= 10.5
    
    # Nisheka lagna position (conception time lagna)
    # Subtract the gestation period from birth lagna
    nisheka_lagna_deg = (janma_lagna_deg - (total_rashis * 30.0)) % 360.0
    
    # Score: 100 if realistic, 50 if close, 0 if unrealistic
    if is_realistic:
        gestation_score = 100.0
    elif 4.0 <= gestation_months <= 11.0:
        gestation_score = 50.0
    else:
        gestation_score = 0.0
    
    return {
        'nisheka_lagna_deg': nisheka_lagna_deg,
        'gestation_months': gestation_months,
        'is_realistic': is_realistic,
        'gestation_score': gestation_score
    }

def apply_moon_purification(moon_deg: float, lagna_deg: float) -> tuple[float, float]:
    """Apply Moon-based purification per BPHS Verse 4.9.
    
    BPHS Verse 4.9:
    दयोहीनबलेऽप्येवं गुलिकात्परिचिन्तयेत्‌।
    तस्मात्तत्सप्तमस्थात्तदं शाच्च कलत्रतः।।९।।
    
    Translation: "Even when not verified by Pranapada and Gulika, 
    consider from Moon. From that, determine ishta-kala 
    by subtracting the 7th portion."
    
    This verse provides a fallback purification method when the primary
    Pranapada and Gulika verification both fail. The method extracts the
    ishta-kala (desired time) by using the Moon's position and subtracting 
    the 7th sign portion (210°), then finding the relationship with lagna.
    
    Formula per BPHS 4.9:
    1. Extract ishta-kala by subtracting the 7th portion (7 signs = 210°) from Moon
    2. Calculate the relationship between lagna and this ishta-kala
    3. This provides both the purification factor and alignment score
    
    Args:
        moon_deg: Moon's sidereal longitude in degrees (0-360).
        lagna_deg: Ascendant longitude in degrees (0-360).
        
    Returns:
        tuple[float, float]: (ishta_kala_deg, purification_score)
        - ishta_kala_deg: Extracted ishta-kala value in degrees (0-360)
        - purification_score: Alignment score (0-100) based on angular relationship
    """
    # Step 1: Extract ishta-kala by subtracting 7th portion from Moon (तस्मात्तत्सप्तमस्थात्तदं)
    # BPHS: "subtracting the 7th portion" = 7 signs = 7 × 30° = 210°
    sevens_portion = moon_deg - (7 * 30.0)  # 7 signs = 210°
    ishta_kala_raw = lagna_deg - sevens_portion
    ishta_kala_deg = ishta_kala_raw % 360.0
    
    # Step 2: Calculate angular relationship for purification scoring
    # Find the 7th house from Moon (opposite position) for alignment verification
    moon_7th_deg = (moon_deg + 180.0) % 360.0
    delta_lagna_moon7th = _angular_difference(lagna_deg, moon_7th_deg)
    
    # Step 3: Convert to purification score (closer alignment = higher score)
    # Using standard 2° orb tolerance for palā-level precision
    moon_purification_orb = STRICT_PADA_EPSILON_DEGREES  # 0.2° for strict mode
    if delta_lagna_moon7th <= moon_purification_orb:
        purification_score = 100.0
    else:
        # Linear decay of score as angular distance increases
        max_orb = 30.0  # Maximum reasonable distance for Moon purification
        purification_score = max(0.0, 100.0 * (1.0 - (delta_lagna_moon7th - moon_purification_orb) / (max_orb - moon_purification_orb)))
    
    logger.debug(f"Moon purification (Verse 4.9): Moon={moon_deg:.2f}°, 7th Moon={moon_7th_deg:.2f}°, "
                f"Lagna={lagna_deg:.2f}°, delta={delta_lagna_moon7th:.2f}°, "
                f"ishta_kala={ishta_kala_deg:.2f}°, score={purification_score:.2f}")
    
    return ishta_kala_deg, purification_score

def _angular_difference(deg1: float, deg2: float) -> float:
    """Compute the minimum angular difference between two degrees on a circle.

    Args:
        deg1: First angle in degrees.
        deg2: Second angle in degrees.

    Returns:
        float: The smallest absolute difference (0–180).
    """
    diff = abs((deg1 - deg2) % 360.0)
    return min(diff, 360.0 - diff)

def apply_bphs_hard_filters(lagna_deg: float,
                            pranapada_deg: float,
                            gulika_deg: float,
                            moon_deg: float,
                            *,
                            madhya_pranapada_deg: Optional[float] = None,
                            orb_tolerance: float = 2.0,
                            strict_bphs: bool = False
                            ) -> tuple[bool, dict[str, float]]:
    """Apply BPHS hard filters to a single candidate time.

    BPHS Verses 4.6, 4.8, 4.10: Mandatory rectification conditions
    
    This function enforces the three primary rectification conditions:
      1. Trine rule (BPHS 4.10) - MANDATORY: the lagna sign must be in 1st, 5th, 
         or 9th from the Prāṇa‑pada sign (human band). If not satisfied, 
         candidate is rejected as non-human birth.
      2. Lagna–Prāṇa‑pada degree equality (BPHS 4.6): padekyata must hold at
         palā granularity (1 palā = 2° of Prāṇa‑pada; see doc lines 1013–1019).
      3. Triple purification (BPHS 4.8): at least one of Prāṇa‑pada, Gulika, 
         or Moon must closely align with the lagna.

    Args:
        lagna_deg: Ascendant longitude in degrees.
        pranapada_deg: Sphuṭa Prāṇa‑pada longitude in degrees.
        madhya_pranapada_deg: Madhya Prāṇa‑pada longitude in degrees (BPHS 4.5).
        gulika_deg: Gulika‑lagna longitude (choose appropriate day/night).
        moon_deg: Moon's longitude in degrees.
        orb_tolerance: Allowed orb (degrees) for Gulika/Moon anchors (default: 2.0°).

    Returns:
        tuple[bool, dict[str, float]]: (is_accepted, scores)
        - is_accepted: True if candidate passes all mandatory filters
        - scores: Dictionary with verification scores (0-100) for each check
    """
    # BPHS Verse 4.10: Trine Rule (MANDATORY for human birth)
    # प्राणपदं को राशि से त्रिकोण राशि मे मनुष्यों के जन्मलग्न की राशि होती है।
    # "From Pranapada's rashi, the birth lagna of humans is in TRINE position (1st, 5th, or 9th)."
    lagna_sign = int(math.floor(lagna_deg / 30.0)) % 12
    pranapada_sign = int(math.floor(pranapada_deg / 30.0)) % 12
    sign_diff = (lagna_sign - pranapada_sign) % 12
    # Trine positions: 0 (1st), 4 (5th), 8 (9th)
    passes_trine = sign_diff in (0, 4, 8)

    # BPHS Verse 4.6: Degree Matching (padekyata)
    # लग्नांशप्राणांशपदैक्यता स्यात्
    # "Lagna degrees and Pranapada degrees should be equal (पदैक्यता)"
    alignment_orb = STRICT_ORB_TOLERANCE if strict_bphs else orb_tolerance
    padekyata_tolerance_sphuta = STRICT_PADA_EPSILON_DEGREES if strict_bphs else PADA_EPSILON_DEGREES
    padekyata_tolerance_madhya = PADA_EPSILON_DEGREES if madhya_pranapada_deg is not None else padekyata_tolerance_sphuta
    delta_sphuta_pp = _angular_difference(lagna_deg, pranapada_deg)
    passes_padekyata_sphuta = delta_sphuta_pp <= padekyata_tolerance_sphuta
    degree_match_score = 100.0 if passes_padekyata_sphuta else 0.0

    delta_madhya_pp: Optional[float]
    if madhya_pranapada_deg is not None:
        delta_madhya_pp = _angular_difference(lagna_deg, madhya_pranapada_deg)
        passes_padekyata_madhya = delta_madhya_pp <= padekyata_tolerance_madhya
    else:
        delta_madhya_pp = None
        passes_padekyata_madhya = True

    # Accept equality when either sphuṭa OR madhya Pranapada matches lagna.
    passes_padekyata = passes_padekyata_sphuta or (
        madhya_pranapada_deg is not None and passes_padekyata_madhya
    )

    # BPHS Verse 4.8: Triple Verification
    # विना प्राणपदाच्छुद्धो गुलिकाद्वा निशाकराद्
    # "Must be verified by Pranapada OR Gulika OR Moon"
    # Check Gulika alignment (also check 7th from lagna as per some interpretations)
    direct_gulika_delta = _angular_difference(lagna_deg, gulika_deg)
    gulika_7th_delta = _angular_difference((lagna_deg + 180.0) % 360.0, gulika_deg)
    delta_gulika = min(direct_gulika_delta, gulika_7th_delta)
    gulika_anchor = 'gulika' if delta_gulika == direct_gulika_delta else 'gulika_7th'
    gulika_score = max(0.0, (alignment_orb - delta_gulika) / alignment_orb) * 100.0
    gulika_score = min(100.0, gulika_score)

    # Check Moon alignment (निशाकराद्)
    delta_moon = _angular_difference(lagna_deg, moon_deg)
    moon_score = max(0.0, (alignment_orb - delta_moon) / alignment_orb) * 100.0
    moon_score = min(100.0, moon_score)

    # BPHS Verse 4.9: Moon-based Purification Fallback
    # दयोहीनबलेऽप्येवं गुलिकात्परिचिन्तयेत्‌ तस्मात्तत्सप्तमस्थात्तदं शाच्च कलत्रतः
    # "Even when not verified by Pranapada and Gulika, consider from Moon"
    ishta_kala_deg, moon_purification_score = apply_moon_purification(moon_deg, lagna_deg)

    purification_anchor = None
    anchor_score = 0.0

    # Enhanced purification sequence: Pranapada → Moon (direct alignment) → Gulika → Moon (Verse 4.9)
    if passes_padekyata:
        purification_anchor = 'pranapada'
        anchor_score = degree_match_score
    elif delta_moon <= alignment_orb:
        purification_anchor = 'moon'
        anchor_score = moon_score
    elif delta_gulika <= alignment_orb:
        purification_anchor = 'gulika' if gulika_anchor == 'gulika' else 'gulika_7th'
        anchor_score = gulika_score
    elif moon_purification_score > 60.0:  # Verse 4.9 fallback when others fail (higher threshold for quality)
        purification_anchor = 'moon_verse9'
        anchor_score = moon_purification_score

    combined_verification = anchor_score
    passes_purification = purification_anchor is not None

    # Accept only when the Trine Rule AND padekyata AND purification anchor are present.
    is_accepted = passes_trine and passes_padekyata and passes_purification

    rejection_reason = None
    if not passes_trine:
        # BPHS 4.10-4.11 non-human classifications by sign distance
        if sign_diff in (2, 6, 10):
            classification = 'pashu'  # terrestrial animals
        elif sign_diff in (3, 7, 11):
            classification = 'pakshi'  # birds
        else:
            classification = 'keeta_sarpa_jalachara'  # insects/reptiles/aquatic
        rejection_reason = f"Non-human per BPHS 4.10-4.11 ({classification})"
        non_human_classification = classification
    elif not passes_padekyata:
        # Distinguish whether sphuṭa or madhya alignment failed.
        if not passes_padekyata_sphuta and (madhya_pranapada_deg is not None and passes_padekyata_madhya):
            rejection_reason = "Fails BPHS 4.6 sphuta padekyata; madhya matches but sphuta does not"
        elif passes_padekyata_sphuta and madhya_pranapada_deg is not None and not passes_padekyata_madhya:
            rejection_reason = "Fails BPHS 4.6 madhya padekyata; sphuta matches but madhya does not"
        else:
            rejection_reason = "Fails BPHS 4.6 padekyata (Lagna != Pranapada at palā resolution)"
        non_human_classification = 'sthavara' if not passes_purification else None
    elif not passes_purification:
        rejection_reason = "Fails BPHS 4.8 purification sequence (no Prāṇa‑pada, Moon, or Gulika anchor)"
        non_human_classification = 'sthavara'
    else:
        non_human_classification = None

    scores = {
        'degree_match': round(degree_match_score, 2),
        'gulika_alignment': round(gulika_score, 2),
        'moon_alignment': round(moon_score, 2),
        'moon_purification_score': round(moon_purification_score, 2),  # Verse 4.9 score
        'ishta_kala_deg': round(ishta_kala_deg, 2),  # Verse 4.9 ishta-kala extraction
        'combined_verification': round(combined_verification, 2),
        'passes_trine_rule': passes_trine,
        'passes_padekyata': passes_padekyata,
        'passes_padekyata_sphuta': passes_padekyata_sphuta,
        'passes_padekyata_madhya': passes_padekyata_madhya,
        'padekyata_tolerance_deg': round(padekyata_tolerance_sphuta, 4),
        'padekyata_tolerance_madhya_deg': round(padekyata_tolerance_madhya, 4),
        'passes_purification': passes_purification,
        'purification_anchor': purification_anchor,
        'gulika_anchor': gulika_anchor,
        'non_human_classification': non_human_classification,
        'rejection_reason': rejection_reason,
        'delta_pranapada_deg': round(delta_sphuta_pp, 4),
        'delta_madhya_pranapada_deg': round(delta_madhya_pp, 4) if delta_madhya_pp is not None else None,
        'delta_gulika_deg': round(delta_gulika, 4),
        'delta_moon_deg': round(delta_moon, 4)
    }

    return is_accepted, scores

# ============================================================================
# Vimshottari Dasha Calculation (BPHS - Dasha System)
# ============================================================================

# Nakshatra lords in order (27 nakshatras, each 13°20')
# Each nakshatra is ruled by one of 9 planets in sequence
_NAKSHATRA_LORDS = [
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',  # Ashwini to Mrigashira
    'Rahu', 'Jupiter', 'Saturn', 'Mercury',   # Ardra to Ashlesha
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',   # Magha to Chitra
    'Rahu', 'Jupiter', 'Saturn', 'Mercury',   # Swati to Jyeshtha
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',   # Mula to Dhanishta
    'Rahu', 'Jupiter', 'Saturn', 'Mercury'     # Shatabhisha to Revati
]

# Vimshottari dasha periods in years
_DASHA_PERIODS = {
    'Ketu': 7,
    'Venus': 20,
    'Sun': 6,
    'Moon': 10,
    'Mars': 7,
    'Rahu': 18,
    'Jupiter': 16,
    'Saturn': 19,
    'Mercury': 17
}

def get_moon_nakshatra(moon_longitude: float) -> int:
    """Get Moon's nakshatra number (0-26).
    
    Each nakshatra spans 13°20' (13.333... degrees).
    
    Args:
        moon_longitude: Moon's sidereal longitude in degrees (0-360).
        
    Returns:
        int: Nakshatra number (0-26).
    """
    nakshatra_span = 360.0 / 27.0  # 13°20'
    nakshatra_num = int(math.floor(moon_longitude / nakshatra_span)) % 27
    return nakshatra_num

def calculate_vimshottari_dasha(jd_ut_birth: float, moon_longitude: float) -> dict[str, Any]:
    """Calculate Vimshottari dasha sequence starting from birth.
    
    BPHS Reference: Vimshottari is primary among all dasha systems.
    
    Args:
        jd_ut_birth: Julian Day of birth in UT.
        moon_longitude: Moon's sidereal longitude in degrees.
        
    Returns:
        Dict with dasha sequence and start times.
    """
    nakshatra_num = get_moon_nakshatra(moon_longitude)
    nakshatra_lord = _NAKSHATRA_LORDS[nakshatra_num]
    
    # Calculate position within nakshatra (0-1)
    nakshatra_span = 360.0 / 27.0
    position_in_nakshatra = (moon_longitude % nakshatra_span) / nakshatra_span
    
    # Find starting dasha lord in sequence
    dasha_sequence = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
    start_index = dasha_sequence.index(nakshatra_lord)
    
    # Calculate remaining time in first dasha
    first_dasha_lord = nakshatra_lord
    first_dasha_years = _DASHA_PERIODS[first_dasha_lord]
    remaining_years = first_dasha_years * (1.0 - position_in_nakshatra)
    
    return {
        'nakshatra_num': nakshatra_num,
        'nakshatra_lord': nakshatra_lord,
        'first_dasha_lord': first_dasha_lord,
        'first_dasha_remaining_years': remaining_years,
        'dasha_sequence': dasha_sequence,
        'start_index': start_index
    }

def get_dasha_at_date(jd_ut_birth: float, event_date: datetime.date, moon_longitude: float) -> dict[str, Any]:
    """Get running Mahadasha-Antardasha at a given event date.
    
    Args:
        jd_ut_birth: Julian Day of birth in UT.
        event_date: Event date to check.
        moon_longitude: Moon's sidereal longitude at birth.
        
    Returns:
        Dict with 'mahadasha', 'antardasha', and their start/end dates.
    """
    dasha_info = calculate_vimshottari_dasha(jd_ut_birth, moon_longitude)
    
    # Calculate elapsed years from birth
    event_jd = swe.julday(event_date.year, event_date.month, event_date.day, 0.0)
    elapsed_days = event_jd - jd_ut_birth
    elapsed_years = elapsed_days / 365.25
    
    # Start from first dasha
    dasha_sequence = dasha_info['dasha_sequence']
    start_index = dasha_info['start_index']
    remaining_years = dasha_info['first_dasha_remaining_years']
    
    # If elapsed time is within first dasha
    if elapsed_years <= remaining_years:
        mahadasha_lord = dasha_sequence[start_index]
        mahadasha_years = _DASHA_PERIODS[mahadasha_lord]
        years_into_mahadasha = elapsed_years
    else:
        # Find which Mahadasha we're in
        current_years = remaining_years
        dasha_index = start_index
        
        # Move to next dashas until we exceed elapsed_years
        while current_years < elapsed_years:
            dasha_index = (dasha_index + 1) % len(dasha_sequence)
            mahadasha_lord = dasha_sequence[dasha_index]
            mahadasha_years = _DASHA_PERIODS[mahadasha_lord]
            if current_years + mahadasha_years >= elapsed_years:
                # Found the Mahadasha
                years_into_mahadasha = elapsed_years - current_years
                break
            current_years += mahadasha_years
    
    # Find Antardasha (sub-period within Mahadasha)
    antardasha_sequence = dasha_sequence.copy()
    # Rotate to start from Mahadasha lord
    while antardasha_sequence[0] != mahadasha_lord:
        antardasha_sequence.append(antardasha_sequence.pop(0))
    
    antardasha_index = 0
    antardasha_years_elapsed = 0.0
    
    for i, antardasha_lord in enumerate(antardasha_sequence):
        antardasha_years = (_DASHA_PERIODS[antardasha_lord] * mahadasha_years) / 120.0
        if antardasha_years_elapsed + antardasha_years >= years_into_mahadasha:
            antardasha_index = i
            break
        antardasha_years_elapsed += antardasha_years
    
    antardasha_lord = antardasha_sequence[antardasha_index]
    antardasha_years = (_DASHA_PERIODS[antardasha_lord] * mahadasha_years) / 120.0
    
    return {
        'mahadasha': mahadasha_lord,
        'antardasha': antardasha_lord,
        'years_into_mahadasha': years_into_mahadasha,
        'years_into_antardasha': years_into_mahadasha - antardasha_years_elapsed
    }

# ============================================================================
# Divisional Charts (Varga Charts)
# ============================================================================

def calculate_divisional_chart(lagna_deg: float, planets: dict[str, float], division: int) -> dict[str, float]:
    """Calculate divisional chart positions for all planets.
    
    BPHS Reference: Divisional charts used for specific life areas:
    - D-3 (Drekkana): Siblings, courage
    - D-7 (Saptamsa): Children
    - D-9 (Navamsa): Marriage, spouse
    - D-10 (Dasamsa): Career, profession
    - D-12 (Dwadasamsa): Parents, family
    - D-60 (Shashtiamsa): Detailed analysis
    
    Args:
        lagna_deg: Ascendant longitude in degrees.
        planets: Dict of planet longitudes (sun, moon, mars, etc.).
        division: Division number (3, 7, 9, 10, 12, or 60).
        
    Returns:
        Dict with divisional chart positions for lagna and all planets.
    """
    divisional_positions = {}
    
    # Calculate lagna in divisional chart
    lagna_sign = int(math.floor(lagna_deg / 30.0)) % 12
    lagna_deg_in_sign = lagna_deg % 30.0
    division_size = 30.0 / division
    division_part = int(math.floor(lagna_deg_in_sign / division_size))
    divisional_lagna_sign = (lagna_sign * division + division_part) % 12
    divisional_lagna_deg = (divisional_lagna_sign * 30.0) + ((lagna_deg_in_sign % division_size) * division)
    divisional_positions['lagna'] = divisional_lagna_deg % 360.0
    
    # Calculate each planet in divisional chart
    for planet_name, planet_deg in planets.items():
        planet_sign = int(math.floor(planet_deg / 30.0)) % 12
        planet_deg_in_sign = planet_deg % 30.0
        division_part = int(math.floor(planet_deg_in_sign / division_size))
        divisional_planet_sign = (planet_sign * division + division_part) % 12
        divisional_planet_deg = (divisional_planet_sign * 30.0) + ((planet_deg_in_sign % division_size) * division)
        divisional_positions[planet_name] = divisional_planet_deg % 360.0
    
    return divisional_positions

def _get_house_from_lagna(planet_deg: float, lagna_deg: float) -> int:
    """Get house number (1-12) of planet from lagna.
    
    Args:
        planet_deg: Planet longitude in degrees.
        lagna_deg: Lagna longitude in degrees.
        
    Returns:
        int: House number (1-12).
    """
    diff = (planet_deg - lagna_deg) % 360.0
    house = int(math.floor(diff / 30.0)) + 1
    return house if house <= 12 else 1

def _get_sign_lord(sign: int) -> str:
    """Get lord of zodiac sign.
    
    Args:
        sign: Sign number (0=Aries, 1=Taurus, ..., 11=Pisces).
        
    Returns:
        str: Planet name (sun, moon, mars, mercury, jupiter, venus, saturn).
    """
    sign_lords = {
        0: 'mars',    # Aries
        1: 'venus',   # Taurus
        2: 'mercury', # Gemini
        3: 'moon',    # Cancer
        4: 'sun',     # Leo
        5: 'mercury', # Virgo
        6: 'venus',   # Libra
        7: 'mars',    # Scorpio
        8: 'jupiter', # Sagittarius
        9: 'saturn',  # Capricorn
        10: 'saturn', # Aquarius
        11: 'jupiter' # Pisces
    }
    return sign_lords[sign % 12]

def calculate_upagrahas(sun_longitude: float) -> dict[str, float]:
    """Calculate the longitudes of the five non-luminous planets (Upagrahas).
    
    BPHS Verses 3.53-56: dhumadyaprakashagrahanayanamaha
    
    Args:
        sun_longitude: Sun's sidereal longitude in degrees.
        
    Returns:
        Dict with keys: 'dhuma', 'vyatipata', 'parivesha', 'indrachapa', 'upaketu'
    """
    # BPHS 3.53: Dhuma = Sun + 4 signs, 13 degrees, 20 minutes
    # 4 signs = 120 degrees. 13 degrees. 20 minutes = 13.333... degrees.
    # Total = 133.333... degrees
    dhuma = (sun_longitude + 133 + (20 / 60.0)) % 360.0
    
    # BPHS 3.54: Vyatipata = 12 signs - Dhuma
    vyatipata = (360.0 - dhuma) % 360.0
    
    # BPHS 3.54: Parivesha = Vyatipata + 6 signs
    parivesha = (vyatipata + 180.0) % 360.0
    
    # BPHS 3.55: Indrachapa (Kodanda) = 12 signs - Parivesha
    indrachapa = (360.0 - parivesha) % 360.0
    
    # BPHS 3.55: Upaketu = Indrachapa + 16 degrees, 40 minutes
    # 16 degrees, 40 minutes = 16.666... degrees
    # The verse actually says to add 16d 40m, but also that adding 1 sign (30d) to Upaketu gives Sun.
    # Let's use the check: Upaketu = Sun - 1 sign
    upaketu = (sun_longitude - 30.0) % 360.0

    return {
        'dhuma': dhuma,
        'vyatipata': vyatipata,
        'parivesha': parivesha,
        'indrachapa': indrachapa,
        'upaketu': upaketu
    }

# ============================================================================
# Physical Traits Scoring (BPHS Chapter 2)
# ============================================================================

def score_physical_traits(lagna_deg: float, planets: dict[str, float], traits: dict[str, str]) -> dict[str, float]:
    """Comprehensive physical traits scoring based on BPHS Chapter 2 verses.
    
    BPHS Verses 2.3-2.23: Enhanced physical characteristics analysis including:
    - Lagna sign characteristics per verses 2.6-2.23
    - Planetary influences on lagna and body
    - Planetary aspects on physical appearance
    - Lagna lord strength considerations
    - House lord combinations for body type
    
    Args:
        lagna_deg: Ascendant longitude in degrees.
        planets: Dict of planet longitudes.
        traits: Dict with keys 'height', 'build', 'complexion' and values like 'TALL', 'ATHLETIC', 'FAIR'.
        
    Returns:
        Dict with enhanced scores (0-100) for each trait plus accuracy metrics.
    """
    scores = {}
    lagna_sign = int(math.floor(lagna_deg / 30.0)) % 12
    lagna_deg_in_sign = lagna_deg % 30.0
    
    # Enhanced normalization of traits
    height_trait = None
    build_trait = None
    complexion_trait = None

    if traits:
        height_trait = str(traits.get('height') or traits.get('height_band') or '').upper() or None
        build_trait = str(traits.get('build') or traits.get('build_band') or '').upper() or None
        complexion_trait = str(traits.get('complexion') or traits.get('complexion_tone') or '').upper() or None
        if not height_trait:
            try:
                height_cm = float(traits.get('height_cm', 0.0))
                if height_cm >= 175:
                    height_trait = 'TALL'
                elif height_cm <= 160:
                    height_trait = 'SHORT'
                elif height_cm > 0:
                    height_trait = 'MEDIUM'
            except (TypeError, ValueError):
                height_trait = None
        if not build_trait and traits.get('body_frame'):
            frame = str(traits['body_frame']).lower()
            if 'athletic' in frame or 'muscular' in frame:
                build_trait = 'ATHLETIC'
            elif 'slim' in frame or 'ecto' in frame:
                build_trait = 'SLIM'
            elif 'heavy' in frame or 'broad' in frame or 'endo' in frame:
                build_trait = 'HEAVY'
    
    # Helper function to get planets in lagna with precise orbs
    def get_planets_in_lagna(orb_degrees: float = 8.0) -> list[str]:
        """Get planets within specified degrees of lagna."""
        planets_in_lagna = []
        for planet_name, planet_deg in planets.items():
            planet_house = int(math.floor((planet_deg - lagna_deg) % 360.0 / 30.0))
            if planet_house == 0:  # In 1st house
                planet_anomaly = planet_deg % 30.0
                lagna_anomaly = lagna_deg_in_sign
                angular_diff = min(abs(planet_anomaly - lagna_anomaly), 30.0 - abs(planet_anomaly - lagna_anomaly))
                if angular_diff <= orb_degrees:
                    planets_in_lagna.append(planet_name)
        return planets_in_lagna
    
    # Helper function to calculate planetary aspects
    def get_planet_aspects_to_lagna() -> dict[str, float]:
        """Calculate aspect strength of planets to lagna."""
        aspects = {}
        for planet_name, planet_deg in planets.items():
            # Calculate angular separation
            separation = (lagna_deg - planet_deg) % 360.0
            aspect_strength = 0.0
            
            # Aspect calculations (full strength = 100)
            if planet_name in ['sun', 'moon', 'jupiter', 'mars']:  # These have aspects
                if abs(separation - 180.0) < 10.0:  # 7th aspect (opposition)
                    aspect_strength = 100.0
                elif planet_name in ['jupiter', 'mars']:
                    if abs(separation - 120.0) < 8.0 or abs(separation - 240.0) < 8.0:  # 5th and 9th aspects
                        aspect_strength = 75.0
                elif planet_name in ['saturn']:
                    if abs(separation - 120.0) < 8.0 or abs(separation - 240.0) < 8.0:  # 3rd and 10th aspects
                        aspect_strength = 75.0
                    elif abs(separation - 60.0) < 8.0 or abs(separation - 300.0) < 8.0:  # 4th and 8th aspects
                        aspect_strength = 50.0
                elif planet_name in ['mercury', 'venus']:
                    if abs(separation - 90.0) < 8.0 or abs(separation - 270.0) < 8.0:  # 4th and 10th aspects
                        aspect_strength = 50.0
            
            if aspect_strength > 0:
                aspects[planet_name] = aspect_strength
        
        return aspects
    
    # Enhanced height scoring (BPHS 2.6-2.23 with planetary influences)
    if height_trait:
        # Primary sign classifications per BPHS Chapter 2
        large_signs = {0: 'Aries', 1: 'Taurus', 4: 'Leo', 9: 'Capricorn'}  # Fixed large body
        medium_signs = {2: 'Gemini', 5: 'Virgo', 6: 'Libra', 10: 'Aquarius', 11: 'Pisces'}
        small_signs = {3: 'Cancer', 7: 'Scorpio'}
        
        planets_in_lagna = get_planets_in_lagna()
        aspects_to_lagna = get_planet_aspects_to_lagna()
        lagnesh = _get_sign_lord(lagna_sign)
        
        height_score = 0.0
        if height_trait == 'TALL':
            if lagna_sign in large_signs:
                height_score = 75.0  # Base score for correct sign
                # Jupiter/Saturn influence enhances height
                if 'jupiter' in planets_in_lagna or aspects_to_lagna.get('jupiter', 0) >= 50:
                    height_score += 15.0
                if 'saturn' in planets_in_lagna or aspects_to_lagna.get('saturn', 0) >= 75:
                    height_score += 10.0
                # Sun aspect can also indicate tall stature
                if aspects_to_lagna.get('sun', 0) >= 75:
                    height_score += 5.0
                    
        elif height_trait == 'MEDIUM':
            if lagna_sign in medium_signs:
                height_score = 75.0  # Base score
                # Mercury influence for moderate height
                if 'mercury' in planets_in_lagna or aspects_to_lagna.get('mercury', 0) >= 50:
                    height_score += 15.0
                # Venus gives balanced proportions
                if 'venus' in planets_in_lagna or aspects_to_lagna.get('venus', 0) >= 50:
                    height_score += 10.0
                    
        elif height_trait == 'SHORT':
            if lagna_sign in small_signs:
                height_score = 75.0  # Base score
                # Saturn can indicate shorter stature
                if 'saturn' in planets_in_lagna and aspects_to_lagna.get('saturn', 0) >= 75:
                    height_score += 15.0
                # Moon influence can indicate smaller frame
                if 'moon' in planets_in_lagna:
                    height_score += 10.0
        
        scores['height'] = min(100.0, height_score)
    else:
        scores['height'] = 0.0
    
    # Enhanced build scoring (BPHS 2.3-2.5 with comprehensive planetary analysis)
    if build_trait:
        planets_in_lagna = get_planets_in_lagna()
        aspects_to_lagna = get_planet_aspects_to_lagna()
        lagnesh = _get_sign_lord(lagna_sign)
        
        build_score = 40.0  # Base score
        
        if build_trait == 'ATHLETIC':
            # Mars: significator of muscles and athletic build
            if 'mars' in planets_in_lagna:
                build_score += 30.0
            elif aspects_to_lagna.get('mars', 0) >= 75:
                build_score += 20.0
            elif lagnesh == 'mars':
                build_score += 15.0
            
            # Jupiter: growth and expansive nature
            if 'jupiter' in planets_in_lagna:
                build_score += 15.0
            elif aspects_to_lagna.get('jupiter', 0) >= 50:
                build_score += 10.0
            
            # Sun: vitality and strong constitution
            if aspects_to_lagna.get('sun', 0) >= 75:
                build_score += 10.0
                
        elif build_trait == 'SLIM':
            # Mercury: lean and slender build
            if 'mercury' in planets_in_lagna:
                build_score += 30.0
            elif aspects_to_lagna.get('mercury', 0) >= 75:
                build_score += 20.0
            elif lagnesh == 'mercury':
                build_score += 15.0
            
            # Venus: graceful and lean physique
            if 'venus' in planets_in_lagna:
                build_score += 15.0
            elif aspects_to_lagna.get('venus', 0) >= 50:
                build_score += 10.0
            
            # Saturn can sometimes give slender build
            if lagnesh == 'saturn':
                build_score += 10.0
                
        elif build_trait == 'HEAVY':
            # Saturn: heaviness and broad structure
            if 'saturn' in planets_in_lagna:
                build_score += 30.0
            elif aspects_to_lagna.get('saturn', 0) >= 75:
                build_score += 20.0
            elif lagnesh == 'saturn':
                build_score += 15.0
            
            # Jupiter can also give heavy build when strong
            if aspects_to_lagna.get('jupiter', 0) >= 75:
                build_score += 15.0
            
            # Moon can indicate fullness
            if 'moon' in planets_in_lagna:
                build_score += 10.0
        
        scores['build'] = min(100.0, build_score)
    else:
        scores['build'] = 0.0
    
    # Enhanced complexion scoring (BPHS 2.5, 2.16 with detailed planetary combinations)
    if complexion_trait:
        planets_in_lagna = get_planets_in_lagna()
        aspects_to_lagna = get_planet_aspects_to_lagna()
        
        complexion_score = 0.0
        
        if complexion_trait == 'FAIR':
            # Moon: fair and lustrous complexion (BPHS 2.5)
            if 'moon' in planets_in_lagna:
                complexion_score = 80.0
            elif aspects_to_lagna.get('moon', 0) >= 75:
                complexion_score = 60.0
            # Venus: fair and bright complexion (BPHS 2.5)
            if 'venus' in planets_in_lagna:
                complexion_score = max(complexion_score, 70.0)
            elif aspects_to_lagna.get('venus', 0) >= 50:
                complexion_score = max(complexion_score, 50.0)
            # Jupiter can give fair complexion
            if 'jupiter' in planets_in_lagna:
                complexion_score = max(complexion_score, 60.0)
                
        elif complexion_trait == 'WHEATISH':
            # Jupiter: wheatish/bright complexion (BPHS 2.16)
            if 'jupiter' in planets_in_lagna:
                complexion_score = 80.0
            elif aspects_to_lagna.get('jupiter', 0) >= 75:
                complexion_score = 60.0
            # Venus can give wheatish tone
            if 'venus' in planets_in_lagna or aspects_to_lagna.get('venus', 0) >= 50:
                complexion_score = max(complexion_score, 65.0)
            # Sun can give golden/wheatish tone
            if aspects_to_lagna.get('sun', 0) >= 75:
                complexion_score = max(complexion_score, 55.0)
                
        elif complexion_trait == 'REDDISH':
            # Sun: reddish-dark complexion (BPHS 2.5)
            if 'sun' in planets_in_lagna:
                complexion_score = 80.0
            elif aspects_to_lagna.get('sun', 0) >= 75:
                complexion_score = 60.0
            # Mars: red and reddish complexion (BPHS 2.5)
            if 'mars' in planets_in_lagna:
                complexion_score = max(complexion_score, 75.0)
            elif aspects_to_lagna.get('mars', 0) >= 50:
                complexion_score = max(complexion_score, 55.0)
                
        elif complexion_trait == 'DULL_GREEN':
            # Mercury: dull green (durva grass) complexion (BPHS 2.5)
            if 'mercury' in planets_in_lagna:
                complexion_score = 85.0
            elif aspects_to_lagna.get('mercury', 0) >= 75:
                complexion_score = 65.0
                
        elif complexion_trait == 'DARK':
            # Saturn: dark and black complexion (BPHS 2.16)
            if 'saturn' in planets_in_lagna:
                complexion_score = 80.0
            elif aspects_to_lagna.get('saturn', 0) >= 75:
                complexion_score = 60.0
            # Sun can contribute to dark complexion when weak
            if aspects_to_lagna.get('sun', 0) >= 50:
                complexion_score = max(complexion_score, 40.0)
        
        scores['complexion'] = complexion_score
    else:
        scores['complexion'] = 0.0
    
    # Calculate comprehensive overall score with accuracy metrics
    trait_scores = [s for s in [scores.get('height', 0), scores.get('build', 0), scores.get('complexion', 0)] if s > 0]
    if trait_scores:
        scores['overall'] = sum(trait_scores) / len(trait_scores)
        scores['accuracy'] = {
            'traits_evaluated': len(trait_scores),
            'max_possible_score': 100.0,
            'confidence_level': 'High' if len(trait_scores) >= 3 else 'Medium' if len(trait_scores) == 2 else 'Low'
        }
    else:
        scores['overall'] = 0.0
        scores['accuracy'] = {
            'traits_evaluated': 0,
            'max_possible_score': 100.0,
            'confidence_level': 'None'
        }
    
    # Add BPHS verse references for validation
    scores['bphs_references'] = {
        'height': ['BPHS 2.6-2.23', 'Lord of lagna significance in 2.3-2.4'],
        'build': ['BPHS 2.3-2.5', 'Planetary combinations in 2.4'],
        'complexion': ['BPHS 2.5', '2.16 planetary complexions']
    }
    
    return scores

# ============================================================================
# Life Events Verification (BPHS Chapter 12 + Dashas)
# ============================================================================

def verify_life_events(jd_ut_birth: float, lagna_deg: float, planets: dict[str, float], 
                       events: dict[str, Any], moon_longitude: float) -> dict[str, float]:
    """Verify life events using dashas and divisional charts.
    
    BPHS Chapter 12: Life events timing and verification.
    
    Args:
        jd_ut_birth: Julian Day of birth in UT.
        lagna_deg: Ascendant longitude in degrees.
        planets: Dict of planet longitudes.
        events: Dict with 'marriage', 'children', 'career' keys.
        moon_longitude: Moon's sidereal longitude at birth.
        
    Returns:
        Dict with scores (0-100) for each event category.
    """
    scores = {}
    events = events or {}

    def _first_date(item: Any) -> Optional[str]:
        if isinstance(item, str):
            return item
        if isinstance(item, dict):
            date_val = item.get('date')
            return date_val
        return None
    
    # Marriage verification (D-9 Navamsa, 7th house)
    marriage_entry = events.get('marriage')
    marriage_list = events.get('marriages') if isinstance(events.get('marriages'), list) else None
    marriage_date_str = None
    if marriage_entry:
        marriage_date_str = _first_date(marriage_entry)
    if not marriage_date_str and marriage_list:
        for m in marriage_list:
            md = _first_date(m)
            if md:
                marriage_date_str = md
                break

    if marriage_date_str:
        try:
            marriage_date = datetime.datetime.strptime(marriage_date_str, '%Y-%m-%d').date()
            dasha_at_marriage = get_dasha_at_date(jd_ut_birth, marriage_date, moon_longitude)
            
            # Calculate D-9 chart
            d9 = calculate_divisional_chart(lagna_deg, planets, 9)
            d9_lagna = d9['lagna']
            d9_7th_house = (d9_lagna + 180.0) % 360.0  # 7th from lagna
            d9_7th_sign = int(math.floor(d9_7th_house / 30.0)) % 12
            d9_7th_lord = _get_sign_lord(d9_7th_sign)
            
            # Favorable dashas for marriage: Venus, Jupiter, Moon
            favorable_dashas = ['venus', 'jupiter', 'moon']
            dasha_score = 100.0 if dasha_at_marriage['mahadasha'].lower() in favorable_dashas else 50.0
            
            # D-9 7th house should have benefic influence
            benefic_planets = ['venus', 'jupiter', 'moon', 'mercury']
            d9_score = 100.0 if d9_7th_lord in benefic_planets else 50.0
            
            scores['marriage'] = (dasha_score + d9_score) / 2.0
        except (ValueError, KeyError):
            scores['marriage'] = 0.0
    else:
        scores['marriage'] = 0.0
    
    # Children verification (D-7 Saptamsa, 5th house)
    children_entries = events.get('children')
    if children_entries:
        child_dates: list[str] = []
        if isinstance(children_entries, list):
            for child in children_entries:
                cd = _first_date(child)
                if cd:
                    child_dates.append(cd)
        elif isinstance(children_entries, dict):
            child_dates = children_entries.get('dates', [])
            if not child_dates and 'date' in children_entries:
                cd = _first_date(children_entries)
                if cd:
                    child_dates = [cd]
        children_count = len(child_dates)
        children_dates = child_dates
        
        if children_count > 0 and children_dates:
            # Calculate D-7 chart
            d7 = calculate_divisional_chart(lagna_deg, planets, 7)
            d7_lagna = d7['lagna']
            d7_5th_house = (d7_lagna + 120.0) % 360.0  # 5th from lagna
            d7_5th_sign = int(math.floor(d7_5th_house / 30.0)) % 12
            d7_5th_lord = _get_sign_lord(d7_5th_sign)
            
            # Verify each child birth date
            child_scores = []
            for child_date_str in children_dates[:children_count]:
                try:
                    child_date = datetime.datetime.strptime(child_date_str, '%Y-%m-%d').date()
                    dasha_at_birth = get_dasha_at_date(jd_ut_birth, child_date, moon_longitude)
                    
                    # Favorable dashas for children: Jupiter, Moon, Venus
                    favorable_dashas = ['jupiter', 'moon', 'venus']
                    dasha_score = 100.0 if dasha_at_birth['mahadasha'].lower() in favorable_dashas else 50.0
                    child_scores.append(dasha_score)
                except (ValueError, KeyError):
                    child_scores.append(0.0)
            
            # D-7 5th house should have benefic influence
            benefic_planets = ['jupiter', 'moon', 'venus']
            d7_score = 100.0 if d7_5th_lord in benefic_planets else 50.0
            
            if child_scores:
                scores['children'] = (sum(child_scores) / len(child_scores) + d7_score) / 2.0
            else:
                scores['children'] = d7_score
        else:
            scores['children'] = 0.0
    else:
        scores['children'] = 0.0
    
    # Career verification (D-10 Dasamsa, 10th house, BPHS 12.211)
    if 'career' in events and events['career']:
        career_dates_raw = events['career']
        career_dates: list[str] = []
        if isinstance(career_dates_raw, list):
            for entry in career_dates_raw:
                cd = _first_date(entry)
                if cd:
                    career_dates.append(cd)
        else:
            career_dates = career_dates_raw if isinstance(career_dates_raw, list) else []
        
        if career_dates:
            # Calculate D-10 chart
            d10 = calculate_divisional_chart(lagna_deg, planets, 10)
            d10_lagna = d10['lagna']
            d10_10th_house = d10_lagna  # 10th house = lagna in D-10
            d10_10th_sign = int(math.floor(d10_10th_house / 30.0)) % 12
            d10_10th_lord = _get_sign_lord(d10_10th_sign)
            
            # Verify each career event date
            career_scores = []
            for career_date_str in career_dates:
                try:
                    career_date = datetime.datetime.strptime(career_date_str, '%Y-%m-%d').date()
                    dasha_at_event = get_dasha_at_date(jd_ut_birth, career_date, moon_longitude)
                    
                    # Favorable dashas for career: Sun, Jupiter, Mercury
                    favorable_dashas = ['sun', 'jupiter', 'mercury']
                    dasha_score = 100.0 if dasha_at_event['mahadasha'].lower() in favorable_dashas else 50.0
                    career_scores.append(dasha_score)
                except (ValueError, KeyError):
                    career_scores.append(0.0)
            
            # D-10 10th lord should be strong (not weak per BPHS 12.211)
            # Strong planets: Sun, Jupiter, Mars
            strong_planets = ['sun', 'jupiter', 'mars']
            d10_score = 100.0 if d10_10th_lord in strong_planets else 50.0
            
            if career_scores:
                scores['career'] = (sum(career_scores) / len(career_scores) + d10_score) / 2.0
            else:
                scores['career'] = d10_score
        else:
            scores['career'] = 0.0
    else:
        scores['career'] = 0.0

    # Major events (health/relocation/awards) - dashā alignment heuristic
    if 'major' in events and events['major']:
        major_events_raw = events['major']
        major_dates: list[str] = []
        if isinstance(major_events_raw, list):
            for entry in major_events_raw:
                ed = _first_date(entry)
                if ed:
                    major_dates.append(ed)
        if major_dates:
            major_scores = []
            for major_date in major_dates:
                try:
                    event_date = datetime.datetime.strptime(major_date, '%Y-%m-%d').date()
                    dasha = get_dasha_at_date(jd_ut_birth, event_date, moon_longitude)
                    # Benefic dashas for stability/health/recognition per general BPHS benefic list
                    benefic_dashas = ['jupiter', 'venus', 'moon', 'mercury']
                    score = 80.0 if dasha['mahadasha'].lower() in benefic_dashas else 60.0
                    major_scores.append(score)
                except (ValueError, KeyError):
                    major_scores.append(50.0)
            scores['major'] = sum(major_scores) / len(major_scores) if major_scores else 0.0
        else:
            scores['major'] = 0.0
    else:
        scores['major'] = 0.0
    
    # Calculate overall life events score
    event_scores = [s for s in scores.values() if s > 0]
    if event_scores:
        scores['overall'] = sum(event_scores) / len(event_scores)
    else:
        scores['overall'] = 0.0
    
    return scores

def palashodhana_search(candidate_record: dict[str, Any], 
                        dob: datetime.date,
                        latitude: float,
                        longitude: float,
                        tz_offset: float,
                        sunrise_local: datetime.datetime,
                        gulika_info: dict[str, float],
                        optional_traits: Optional[dict[str, str]] = None,
                        optional_events: Optional[dict[str, Any]] = None,
                        max_palas: int = PALA_LEVEL_SHODHANA_PALAS,
                        strict_palā_precision: bool = True,
                        window_start_dt: Optional[datetime.datetime] = None,
                        window_end_dt: Optional[datetime.datetime] = None) -> dict[str, Any]:
    """Perform enhanced palā-by-palā śodhana with binary search optimization.
    
    BPHS 4.6 suggests palā-level precision for लग्नांशप्राणांशपदैक्यता (degree equality).
    This function uses a hybrid approach: initial binary search to find optimal range,
    then fine-grained linear search within that range at 24-second resolution.
    
    Args:
        candidate_record: Original candidate record that failed or needs refinement
        dob: Date of birth
        latitude: Birthplace latitude  
        longitude: Birthplace longitude
        tz_offset: Time zone offset from UTC in hours
        sunrise_local: Sunrise time for the date
        gulika_info: Precomputed gulika information
        optional_traits: Optional physical traits dict
        optional_events: Optional life events dict
        max_palas: Maximum palas to search in each direction (default: 720 = full day)
        strict_palā_precision: Whether to use strict 0.2° tolerance or 2° tolerance
        
    Returns:
        dict: Enhanced candidate record with palā-level precision analysis
    """
    base_time_str = candidate_record['time_local']
    base_lagna_deg = candidate_record['lagna_deg']
    base_sphuta_pp = candidate_record['pranapada_deg']
    
    logger.info(f"Enhanced Palā-level śodhana: Base candidate {base_time_str}, "
                f"Lagna={base_lagna_deg:.2f}°, Pranapada={base_sphuta_pp:.2f}°")
    
    # Parse base time
    base_time_local = datetime.datetime.strptime(base_time_str, '%Y-%m-%dT%H:%M:%S')
    
    # Determine tolerance based on precision mode
    tolerance_deg = STRICT_PADA_EPSILON_DEGREES if strict_palā_precision else PADA_EPSILON_DEGREES
    
    def evaluate_pala_offset(pala_offset: int) -> tuple[bool, float, Optional[dict[str, Any]]]:
        """Single evaluation function for cleaner code."""
        if pala_offset == 0:
            return False, 999.0, None
            
        # Calculate adjusted time
        adjusted_time_local = base_time_local + datetime.timedelta(seconds=pala_offset * PALA_SECONDS)
        
        # IMPORTANT: Check if adjusted time stays within user's requested search window
        if window_start_dt and window_end_dt:
            if not (window_start_dt <= adjusted_time_local <= window_end_dt):
                return False, 999.0, None
        
        # Re-evaluate this time with full precision
        jd_ut_val = _datetime_to_jd_ut(adjusted_time_local, tz_offset)
        lagna_val = compute_sidereal_lagna(jd_ut_val, latitude, longitude)
        planets_val = get_planet_positions(jd_ut_val)
        sun_val = planets_val['sun']
        moon_val = planets_val['moon']

        ghatis, palas, total_palas = calculate_ishta_kala(adjusted_time_local, sunrise_local)
        madhya_pp_val = calculate_madhya_pranapada(ghatis, palas)
        sphuta_pp_val = calculate_sphuta_pranapada(total_palas, sun_val)

        # Apply BPHS filters with strict precision
        accepted_val, scores_val = apply_bphs_hard_filters(
            lagna_val, sphuta_pp_val, 
            gulika_info['day_gulika_deg'], moon_val,
            madhya_pranapada_deg=madhya_pp_val,
            orb_tolerance=2.0,
            strict_bphs=True  # Always use strict mode for śodhana
        )
        
        if accepted_val:
            current_delta = _angular_difference(lagna_val, sphuta_pp_val)
            return True, current_delta, (adjusted_time_local, lagna_val, sphuta_pp_val, madhya_pp_val, scores_val)
        else:
            return False, 999.0, None
    
    # Phase 1: Binary search to find promising regions
    best_candidate = candidate_record.copy()
    best_delta = _angular_difference(base_lagna_deg, base_sphuta_pp)
    improved = False
    promising_regions = []
    
    # Binary search in both directions
    search_space = [(-max_palas, 0), (0, max_palas)]
    
    for left, right in search_space:
        if left == 0:  # Skip if this is the base candidate
            continue
            
        # Binary search over the range
        iterations = 0
        max_iterations = int(math.log2(abs(right - left))) + 1
        
        while iterations < max_iterations and (right - left) >= 4:  # Stop when range is small enough
            mid_left = left + (right - left) // 3
            mid_right = right - (right - left) // 3
            
            left_ok, left_delta, _ = evaluate_pala_offset(mid_left)
            right_ok, right_delta, _ = evaluate_pala_offset(mid_right)
            
            # Choose the better half
            if left_ok and (not right_ok or left_delta <= right_delta):
                right = mid_right
            elif right_ok:
                left = mid_left
            else:
                break  # No candidates in this region
                
            iterations += 1
        
        # Record promising region if found
        if iterations > 0 and (right - left) < 50:
            promising_regions.append((left, right))
            logger.debug(f"Found promising region: {left} to {right} palās after {iterations} iterations")
    
    # If no promising regions found, fall back to linear search with limited range
    if not promising_regions:
        promising_regions = [(-30, 0), (0, 30)]
        logger.debug("No promising regions via binary search, using limited linear range")
    
    # Phase 2: Fine-grained linear search within promising regions
    for region_left, region_right in promising_regions:
        for pala_offset in range(region_left, region_right + 1):
            if pala_offset == 0:
                continue
                
            accepted, current_delta, eval_data = evaluate_pala_offset(pala_offset)
            
            if accepted and current_delta < best_delta:
                # Early termination if we achieve very high precision
                if current_delta < 0.05:  # Less than 0.05° = excellent alignment
                    logger.debug(f"Early termination: Found excellent alignment at {current_delta:.3f}°")
                
                best_delta = current_delta
                improved = True
                
                # Extract evaluation data
                adjusted_time_local, lagna_val, sphuta_pp_val, madhya_pp_val, scores_val = eval_data
                
                # Create new candidate record
                enhanced_candidate = candidate_record.copy()
                enhanced_candidate.update({
                    'time_local': adjusted_time_local.strftime('%Y-%m-%dT%H:%M:%S'),
                    'lagna_deg': round(lagna_val, 2),
                    'pranapada_deg': round(sphuta_pp_val, 2),
                    'madhya_pranapada_deg': round(madhya_pp_val, 2),
                    'delta_pp_deg': scores_val.get('delta_pranapada_deg', 0.0),
                    'shodhana_delta_palas': abs(pala_offset),
                    'shodhana_applied': True,
                    'shodhana_mode': 'enhanced_binary',
                    'shodhana_iterations': iterations if 'iterations' in locals() else 0,
                    'scores': scores_val
                })
                
                best_candidate = enhanced_candidate
                
                logger.debug(f"Enhanced Palā śodhana: offset {pala_offset:+d} palās, "
                            f"delta {current_delta:.3f}° -> better than previous {best_delta:.3f}°")
                
                # Break if we achieve target tolerance
                if current_delta <= tolerance_deg:
                    logger.debug(f"Target tolerance achieved: {current_delta:.3f}° <= {tolerance_deg:.3f}°")
                    break
    
    if improved:
        best_candidate['shodhana_success'] = True
        improvement_amount = (best_delta - _angular_difference(base_lagna_deg, base_sphuta_pp))
        best_candidate['overall_improvement'] = f"Delta improved by {improvement_amount:.3f}°"
        
        # Add performance metrics
        if 'iterations' in locals():
            best_candidate['shodhana_iterations'] = iterations
        best_candidate['shodhana_regions_searched'] = len(promising_regions)
        
        logger.info(f"Enhanced Palā-level śodhana SUCCESS: "
                    f"{best_candidate['time_local']} at {best_delta:.3f}° delta "
                    f"(improvement: {improvement_amount:.3f}°, regions: {len(promising_regions)})")
    else:
        best_candidate['shodhana_success'] = False
        best_candidate['shodhana_result'] = "No enhanced palā-level improvement found"
        logger.debug(f"Enhanced Palā-level śodhana: No improvement found within ±{max_palas} palās")
    
    return best_candidate

def search_candidate_times(dob: datetime.date,
                           latitude: float,
                           longitude: float,
                           tz_offset: float,
                           start_time_str: str,
                           end_time_str: str,
                           step_minutes: Optional[float] = None,
                           step_palas: float = 1.0,
                           strict_bphs: bool = False,
                           orb_tolerance: float = 2.0,
                           enable_shodhana: bool = False,
                           max_shodhana_palas: int = 3600,
                           bphs_only_ordering: bool = True,
                           collect_rejections: bool = False,
                           sunrise_local: Optional[datetime.datetime] = None,
                           sunset_local: Optional[datetime.datetime] = None,
                           gulika_info: Optional[dict[str, float]] = None,
                           optional_traits: Optional[dict[str, str]] = None,
                           optional_events: Optional[dict[str, Any]] = None
                           ) -> list[dict[str, Any]]:
    """Search a range of times on a given date and filter by BPHS rules.

    Args:
        dob: The date of birth (local date).
        latitude: Birthplace latitude.
        longitude: Birthplace longitude.
        tz_offset: Time zone offset from UTC in hours.
        start_time_str: Starting local time ("HH:MM").
        end_time_str: Ending local time ("HH:MM").
        step_minutes: Step size between candidate times in minutes (optional override).
        step_palas: Palā-based step size (1 palā = 24 seconds). Used when step_minutes is None.
        sunrise_local: Optionally precomputed sunrise time.
        sunset_local: Optionally precomputed sunset time.
        gulika_info: Optionally precomputed gulika calculation dictionary.
        optional_traits: Optional physical traits dict with 'height', 'build', 'complexion'.
        optional_events: Optional life events dict with 'marriage', 'children', 'career'.

    Returns:
        list[Dict]: List of candidate dictionaries that satisfy BPHS hard rules.
    """
    if sunrise_local is None or sunset_local is None:
        sunrise_local, sunset_local = compute_sunrise_sunset(dob, latitude, longitude, tz_offset)
    if gulika_info is None:
        gulika_info = calculate_gulika(dob, latitude, longitude, tz_offset)
    day_gulika_deg = gulika_info['day_gulika_deg']
    night_gulika_deg = gulika_info['night_gulika_deg']

    def gulika_for_time(dt: datetime.datetime) -> float:
        """Pick day/night Gulika based on local time."""
        return day_gulika_deg if sunrise_local <= dt <= sunset_local else night_gulika_deg

    def evaluate_candidate(candidate_dt: datetime.datetime, gulika_deg_value: float) -> dict[str, Any]:
        """Compute all dependent values for a candidate time."""
        jd_ut_val = _datetime_to_jd_ut(candidate_dt, tz_offset)
        lagna_val = compute_sidereal_lagna(jd_ut_val, latitude, longitude)
        planets_val = get_planet_positions(jd_ut_val)
        sun_val = planets_val['sun']
        moon_val = planets_val['moon']
        saturn_val = planets_val['saturn']

        ghatis, palas, total_palas = calculate_ishta_kala(candidate_dt, sunrise_local)
        madhya_pp_val = calculate_madhya_pranapada(ghatis, palas)
        sphuta_pp_val = calculate_sphuta_pranapada(total_palas, sun_val)
        special_lagnas_val = calculate_special_lagnas((ghatis, palas, total_palas), sun_val, lagna_val)
        nisheka_val = calculate_nisheka_lagna(saturn_val, gulika_deg_value, lagna_val)

        accepted_val, scores_val = apply_bphs_hard_filters(
            lagna_val, sphuta_pp_val, gulika_deg_value, moon_val,
            madhya_pranapada_deg=madhya_pp_val,
            orb_tolerance=orb_tolerance,
            strict_bphs=strict_bphs
        )

        return {
            'jd_ut': jd_ut_val,
            'lagna_deg': lagna_val,
            'planets': planets_val,
            'sun_deg': sun_val,
            'moon_deg': moon_val,
            'saturn_deg': saturn_val,
            'ghatis': ghatis,
            'palas': palas,
            'total_palas': total_palas,
            'madhya_pp': madhya_pp_val,
            'sphuta_pp': sphuta_pp_val,
            'special_lagnas': special_lagnas_val,
            'nisheka': nisheka_val,
            'accepted': accepted_val,
            'scores': scores_val
        }

    def evaluate_and_score(candidate_dt: datetime.datetime) -> dict[str, Any]:
        """Evaluate candidate and attach optional trait/event scores."""
        gulika_deg_value = gulika_for_time(candidate_dt)
        eval_result = evaluate_candidate(candidate_dt, gulika_deg_value)

        traits_scores: dict[str, float] = {}
        if optional_traits:
            traits_scores = score_physical_traits(eval_result['lagna_deg'], eval_result['planets'], optional_traits)

        events_scores: dict[str, float] = {}
        if optional_events:
            jd_ut_birth = eval_result['jd_ut']
            events_scores = verify_life_events(jd_ut_birth, eval_result['lagna_deg'], eval_result['planets'], optional_events, eval_result['moon_deg'])

        return {
            'eval': eval_result,
            'traits_scores': traits_scores,
            'events_scores': events_scores,
            'gulika_deg': gulika_deg_value
        }

    def compose_candidate_record(candidate_dt: datetime.datetime,
                                 eval_result: dict[str, Any],
                                 traits_scores: dict[str, float],
                                 events_scores: dict[str, float],
                                 special_lagnas_val: dict[str, float],
                                 nisheka_val: dict[str, Any],
                                 shodhana_delta_palas: Optional[int] = None) -> dict[str, Any]:
        """Create the candidate payload with composite scoring."""
        scores = eval_result['scores']
        bphs_score = (
            (100.0 if scores['passes_trine_rule'] else 0.0) * 0.40 +
            scores['degree_match'] * 0.30 +
            scores['combined_verification'] * 0.30
        )
        heuristic_score = (
            (traits_scores.get('overall', 0.0) if traits_scores else 0.0) * 0.40 +
            (events_scores.get('overall', 0.0) if events_scores else 0.0) * 0.40 +
            nisheka_val['gestation_score'] * 0.20
        )
        # Keep BPHS compliance primary but let real-world evidence influence ordering.
        composite_score = (bphs_score * 0.7) + (heuristic_score * 0.3)

        candidate_record = {
            'time_local': candidate_dt.strftime('%Y-%m-%dT%H:%M:%S'),
            'lagna_deg': round(eval_result['lagna_deg'], 2),
            'pranapada_deg': round(eval_result['sphuta_pp'], 2),
            'madhya_pranapada_deg': round(eval_result['madhya_pp'], 2),
            'delta_pp_deg': scores['delta_pranapada_deg'],
            'delta_madhya_pp_deg': scores.get('delta_madhya_pranapada_deg'),
            'passes_trine_rule': scores['passes_trine_rule'],
            'purification_anchor': scores.get('purification_anchor'),
            'verification_scores': {
                'degree_match': scores['degree_match'],
                'gulika_alignment': scores['gulika_alignment'],
                'moon_alignment': scores['moon_alignment'],
                'combined_verification': scores['combined_verification'],
                'passes_padekyata_sphuta': scores['passes_padekyata_sphuta'],
                'passes_padekyata_madhya': scores['passes_padekyata_madhya']
            },
            'bphs_score': round(bphs_score, 2),
            'heuristic_score': round(heuristic_score, 2),
            'special_lagnas': {
                'bhava_lagna': round(special_lagnas_val['bhava_lagna'], 2),
                'hora_lagna': round(special_lagnas_val['hora_lagna'], 2),
                'ghati_lagna': round(special_lagnas_val['ghati_lagna'], 2),
                'varnada_lagna': round(special_lagnas_val['varnada_lagna'], 2)
            },
            'nisheka': {
                'nisheka_lagna_deg': round(nisheka_val['nisheka_lagna_deg'], 2),
                'gestation_months': round(nisheka_val['gestation_months'], 2),
                'is_realistic': nisheka_val['is_realistic'],
                'gestation_score': round(nisheka_val['gestation_score'], 2)
            },
            'composite_score': round(composite_score, 2)
        }

        if traits_scores:
            candidate_record['physical_traits_scores'] = {
                k: round(v, 2) if isinstance(v, (int, float)) else v for k, v in traits_scores.items()
            }

        if events_scores:
            candidate_record['life_events_scores'] = {
                k: round(v, 2) if isinstance(v, (int, float)) else v for k, v in events_scores.items()
            }
            candidate_record['heuristic_components'] = {
                'traits_overall': round(traits_scores.get('overall', 0.0), 2) if traits_scores else 0.0,
                'events_overall': round(events_scores.get('overall', 0.0), 2),
                'gestation_score': round(nisheka_val['gestation_score'], 2)
            }

        if shodhana_delta_palas is not None:
            candidate_record['shodhana_delta_palas'] = shodhana_delta_palas

        return candidate_record

    def perform_shodhana(base_dt: datetime.datetime) -> Optional[dict[str, Any]]:
        """Deterministic palā-by-palā shodhana search for padekyatā + trine compliance."""
        best_candidate: Optional[dict[str, Any]] = None
        if effective_shodhana_palas <= 0:
            return None
        for delta_palas in range(1, effective_shodhana_palas + 1):
            for direction in (-1, 1):
                adj_dt = base_dt + datetime.timedelta(seconds=direction * delta_palas * PALA_SECONDS)
                if not is_within_window(adj_dt):
                    continue  # Do not return times outside user-specified window
                adj_bundle = evaluate_and_score(adj_dt)
                adj_eval = adj_bundle['eval']
                if adj_eval['accepted']:
                    best_candidate = compose_candidate_record(
                        adj_dt,
                        adj_eval,
                        adj_bundle['traits_scores'],
                        adj_bundle['events_scores'],
                        adj_eval['special_lagnas'],
                        adj_eval['nisheka'],
                        shodhana_delta_palas=direction * delta_palas
                    )
                    break
            if best_candidate is not None:
                break
        return best_candidate

    start_hour, start_min = map(int, start_time_str.split(':'))
    end_hour, end_min = map(int, end_time_str.split(':'))
    start_dt = datetime.datetime.combine(dob, datetime.time(start_hour, start_min))
    end_dt = datetime.datetime.combine(dob, datetime.time(end_hour, end_min))
    wrap_midnight = False
    if end_dt <= start_dt:
        wrap_midnight = True
        end_dt = end_dt + datetime.timedelta(days=1)

    # Cap palā-by-palā shodhana to the smaller of the requested window, caller
    # limit, and a runtime guard so strict filters cannot trigger hour-long loops.
    window_seconds = max(0.0, (end_dt - start_dt).total_seconds())
    window_palas = int(window_seconds // PALA_SECONDS) if window_seconds else 0
    effective_shodhana_palas = max(
        0,
        min(max_shodhana_palas, window_palas, MAX_RUNTIME_SHODHANA_PALAS)
    )

    if step_minutes is not None:
        if step_minutes <= 0:
            raise ValueError("step_minutes must be positive")
        step_seconds = step_minutes * 60.0
    else:
        if step_palas <= 0:
            raise ValueError("step_palas must be positive")
        step_seconds = step_palas * PALA_SECONDS
    total_steps = max(
        1,
        int(((end_dt - start_dt).total_seconds() // step_seconds) + 1)
    )
    logger.info(
        "search_candidate_times | window=%s-%s wrap_midnight=%s step_seconds=%.1f total_steps=%d strict_bphs=%s shodhana=%s",
        start_dt.isoformat(),
        end_dt.isoformat(),
        wrap_midnight,
        step_seconds,
        total_steps,
        strict_bphs,
        enable_shodhana
    )
    progress_log_interval = max(1, total_steps // 10)

    def is_within_window(dt: datetime.datetime) -> bool:
        """Check if a datetime lies inside the requested search window."""
        return start_dt <= dt <= end_dt

    candidates = []
    rejections: list[dict[str, Any]] = []
    seen_times: set[str] = set()
    current_dt = start_dt
    iteration = 0
    while current_dt <= end_dt:
        iteration += 1
        candidate_local = current_dt
        gulika_deg = gulika_for_time(candidate_local)

        eval_result = evaluate_candidate(candidate_local, gulika_deg)
        accepted = eval_result['accepted']
        scores = eval_result['scores']
        sphuta_pp = eval_result['sphuta_pp']
        lagna_deg = eval_result['lagna_deg']
        special_lagnas = eval_result['special_lagnas']
        nisheka = eval_result['nisheka']
        
        if accepted:
            # Calculate physical traits scores if provided
            traits_scores = {}
            if optional_traits:
                traits_scores = score_physical_traits(lagna_deg, eval_result['planets'], optional_traits)
            
            # Calculate life events scores if provided
            events_scores = {}
            if optional_events:
                jd_ut_birth = eval_result['jd_ut']
                events_scores = verify_life_events(jd_ut_birth, lagna_deg, eval_result['planets'], optional_events, eval_result['moon_deg'])
            
            # Reject candidates that violate BPHS conception realism (Adhyāya 4.12-4.16)
            if not nisheka.get('is_realistic', False):
                if collect_rejections:
                    rejections.append({
                        'time_local': candidate_local.strftime('%Y-%m-%dT%H:%M:%S'),
                        'lagna_deg': round(lagna_deg, 2),
                        'pranapada_deg': round(sphuta_pp, 2),
                        'delta_pp_deg': scores.get('delta_pranapada_deg'),
                        'delta_madhya_pp_deg': scores.get('delta_madhya_pranapada_deg'),
                        'delta_gulika_deg': scores.get('delta_gulika_deg'),
                        'delta_moon_deg': scores.get('delta_moon_deg'),
                        'passes_trine_rule': scores.get('passes_trine_rule', False),
                        'passes_purification': False,
                        'non_human_classification': 'sthavara',
                        'rejection_reason': 'Unrealistic gestation (<5 or >10.5 months) per BPHS 4.12-4.16'
                    })
                current_dt += datetime.timedelta(seconds=step_seconds)
                continue

            candidate_record = compose_candidate_record(
                candidate_local,
                eval_result,
                traits_scores,
                events_scores,
                special_lagnas,
                nisheka
            )
            time_key = candidate_record['time_local']
            if time_key not in seen_times:
                seen_times.add(time_key)
                candidates.append(candidate_record)
        else:
            if enable_shodhana:
                shodhana_candidate = perform_shodhana(candidate_local)
                if shodhana_candidate:
                    time_key = shodhana_candidate['time_local']
                    if time_key not in seen_times:
                        seen_times.add(time_key)
                        candidates.append(shodhana_candidate)
                    current_dt += datetime.timedelta(seconds=step_seconds)
                    continue
            if collect_rejections:
                rejections.append({
                    'time_local': candidate_local.strftime('%Y-%m-%dT%H:%M:%S'),
                    'lagna_deg': round(lagna_deg, 2),
                    'pranapada_deg': round(sphuta_pp, 2),
                    'delta_pp_deg': scores.get('delta_pranapada_deg'),
                    'delta_madhya_pp_deg': scores.get('delta_madhya_pranapada_deg'),
                    'delta_gulika_deg': scores.get('delta_gulika_deg'),
                    'delta_moon_deg': scores.get('delta_moon_deg'),
                    'passes_trine_rule': scores.get('passes_trine_rule', False),
                    'passes_purification': scores.get('passes_purification', False),
                    'non_human_classification': scores.get('non_human_classification'),
                    'rejection_reason': scores.get('rejection_reason')
                })
        current_dt += datetime.timedelta(seconds=step_seconds)
        if iteration % progress_log_interval == 0 or current_dt > end_dt:
            logger.debug(
                "search_candidate_times progress | step=%d/%d (%.1f%%) candidates=%d rejections=%d current=%s",
                iteration,
                total_steps,
                (iteration / total_steps) * 100.0,
                len(candidates),
                len(rejections),
                candidate_local.isoformat()
            )
    
    # Sort candidates by BPHS-only score when requested, else composite score.
    key_field = 'bphs_score' if bphs_only_ordering else 'composite_score'
    candidates.sort(key=lambda x: x.get(key_field, 0.0), reverse=True)
    logger.info(
        "search_candidate_times complete | candidates=%d rejections=%d iterations=%d total_steps=%d",
        len(candidates),
        len(rejections),
        iteration,
        total_steps
    )
    
    # Enhanced palā-level śodhana for best candidates
    if enable_shodhana and len(candidates) > 0 and strict_bphs:
        logger.info(f"Applying palā-level śodhana to top candidates (strict mode)")
        
        # Apply palā-level śodhana to best candidate
        best_candidate = candidates[0]
        enhanced_best = palashodhana_search(
            best_candidate, dob, latitude, longitude, tz_offset,
            sunrise_local, gulika_info, optional_traits, optional_events,
            max_palas=min(120, FULL_DAY_PALAS),  # Conservative limit for performance
            strict_palā_precision=True,
            window_start_dt=start_dt,
            window_end_dt=end_dt
        )
        
        if enhanced_best.get('shodhana_success', False):
            # Check for duplicates before replacing candidate
            existing_times = {c['time_local'] for c in candidates}
            if enhanced_best['time_local'] not in existing_times:
                # Replace the first candidate with enhanced version
                candidates[0] = enhanced_best
                logger.info(f"Best candidate enhanced via palā-level śodhana: "
                           f"{enhanced_best['time_local']} (delta: {enhanced_best.get('delta_pp_deg', 0):.3f}°)")
            else:
                logger.debug(f"Shodhana produced duplicate timestamp {enhanced_best['time_local']}, skipping")
        
        # Try to improve other top candidates if needed
        for i in range(1, min(3, len(candidates))):
            candidate = candidates[i]
            if candidate.get('delta_pp_deg', 999) > 0.5:  # Only improve candidates with notable delta
                enhanced_candidate = palashodhana_search(
                    candidate, dob, latitude, longitude, tz_offset,
                    sunrise_local, gulika_info, optional_traits, optional_events,
                    max_palas=60,  # Smaller range for subsequent candidates
                    strict_palā_precision=True,
                    window_start_dt=start_dt,
                    window_end_dt=end_dt
                )
                if enhanced_candidate.get('shodhana_success', False):
                    # Check for duplicates before replacing
                    existing_times = {c['time_local'] for c in candidates}
                    if enhanced_candidate['time_local'] not in existing_times:
                        candidates[i] = enhanced_candidate
                        logger.debug(f"Candidate {i+1} enhanced via palā-level śodhana: "
                                    f"{enhanced_candidate['time_local']} "
                                    f"(delta: {enhanced_candidate.get('delta_pp_deg', 0):.3f}°)")
                    else:
                        logger.debug(f"Shodhana produced duplicate timestamp {enhanced_candidate['time_local']}, skipping")
    
    if collect_rejections:
        return candidates, rejections
    return candidates
