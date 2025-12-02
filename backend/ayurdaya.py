
"""Longevity (Ayurdaya) Calculation Module.

This module implements the three primary systems of longevity calculation as defined
in Brihat Parashara Hora Shastra (BPHS) Chapters 43-45:
1. Pindayu (Based on planetary positions and strength)
2. Nisargayu (Based on natural years and positions)
3. Amsayu (Based on Navamsa positions)

It also implements the mandatory Haranas (Reductions) required for rectification:
- Astangata (Combustion)
- Satru Kshetra (Enemy Sign)
- Vyayadi (House Placement)
- Krurodaya (Ascendant Malefic)

The final validated longevity is a synthesis of these systems.
"""

import math
from typing import Dict, List, Any, Tuple, Optional
import swisseph as swe

from .astro_utils import (
    SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU,
    PLANETS, EXALTATION_DEGREES as EXALTATION_DEG, RELATIONSHIPS,
    get_sign_lord, get_house_from_lagna, is_retrograde, angular_difference
)

# Constants
LAGNA = 'lagna'

# Full Pindayu Years (Max contribution before reductions)
PINDAYU_MAX_YEARS = {
    SUN: 19.0,
    MOON: 25.0,
    MARS: 15.0,
    MERCURY: 12.0,
    JUPITER: 15.0,
    VENUS: 21.0,
    SATURN: 20.0
}

# Full Nisargayu Years
NISARGAYU_MAX_YEARS = {
    SUN: 20.0,
    MOON: 1.0,
    MARS: 2.0,
    MERCURY: 9.0,
    JUPITER: 18.0,
    VENUS: 20.0,
    SATURN: 50.0
}



def _is_combust(planet: str, planet_deg: float, sun_deg: float) -> bool:
    """Check if planet is combust (Astangata).
    
    Orbs for combustion (approximate mean orbs per BPHS/Standard practice):
    Moon: 12, Mars: 17, Mercury: 14 (12 if retro), Jupiter: 11, Venus: 10 (8 if retro), Saturn: 15.
    """
    if planet == SUN: return False
    
    diff = abs(planet_deg - sun_deg)
    if diff > 180: diff = 360 - diff
    
    orbs = {MOON: 12, MARS: 17, MERCURY: 14, JUPITER: 11, VENUS: 10, SATURN: 15}
    return diff <= orbs.get(planet, 0)



# ============================================================================
# Reduction Logic (Haranas)
# ============================================================================

def apply_haranas(raw_years: Dict[str, float], 
                 planets_deg: Dict[str, float], 
                 lagna_deg: float,
                 speeds: Dict[str, float]) -> Dict[str, float]:
    """Apply the four mandatory reductions (Haranas) to planetary years.
    
    1. Chakra Patha Harana (House Placement Reduction):
       - Malefics in 12th, 11th, 10th, 9th, 8th, 7th lose full, 1/2, 1/3, 1/4, 1/5, 1/6.
       - Benefics lose half that amount.
    2. Satru Kshetra Harana (Enemy Sign Reduction):
       - Lose 1/3 if in enemy sign.
       - Exception: Retrograde planets do not lose (even in enemy sign).
    3. Astangata Harana (Combustion Reduction):
       - Lose 1/2 if combust.
       - Exception: Venus and Saturn do not lose.
    4. Krurodaya Harana (Ascendant Reduction):
       - Reduction to Lagna's years if malefics in Lagna.
       - BPHS 44.29: If Malefic in Lagna, reduce Lagna years. 
       - Simplified rule: Lose 50% if any malefic in House 1.
    """
    
    final_years = raw_years.copy()
    
    # Use consistent constants for malefics; nodes may be absent in legacy input,
    # so we skip them if not provided rather than crashing mid-harana.
    malefics = [SUN, MARS, SATURN, RAHU, KETU]
    benefics = [JUPITER, VENUS, MERCURY, MOON] 
    
    # Check for Krurodaya (Malefic in Lagna) first
    # This affects LAGNA's years if present in raw_years
    malefic_in_lagna = False
    for p in malefics:
        if p not in planets_deg:
            continue
        h = get_house_from_lagna(planets_deg[p], lagna_deg)
        if h == 1:
            malefic_in_lagna = True
            break
                
    if LAGNA in final_years and malefic_in_lagna:
        final_years[LAGNA] = final_years[LAGNA] * 0.5

    for p in PLANETS:
        # Skip if planet not contributing or missing position data
        if p not in raw_years or p not in planets_deg:
            continue
        
        reductions = [] 
        
        deg = planets_deg[p]
        house = get_house_from_lagna(deg, lagna_deg)
        is_retro = is_retrograde(speeds.get(p, 0.0))
        sun_deg = planets_deg.get(SUN)
        is_combust = _is_combust(p, deg, sun_deg) if sun_deg is not None else False
        
        # 1. Chakra Patha Harana (House Placement)
        fraction = 0.0
        if house == 12: fraction = 1.0
        elif house == 11: fraction = 1/2.0
        elif house == 10: fraction = 1/3.0
        elif house == 9: fraction = 1/4.0
        elif house == 8: fraction = 1/5.0
        elif house == 7: fraction = 1/6.0
        
        if p in benefics:
            fraction = fraction / 2.0
            
        reductions.append(fraction)
        
        # 2. Satru Kshetra Harana (Enemy Sign)
        satru_reduction = 0.0
        if not is_retro:
            sign_lord = get_sign_lord(deg)
            rel = RELATIONSHIPS[p].get(sign_lord, 0)
            if rel == -1 and sign_lord != p: 
                satru_reduction = 1/3.0
        reductions.append(satru_reduction)
                
        # 3. Astangata Harana (Combustion)
        combust_reduction = 0.0
        if is_combust and p not in [VENUS, SATURN]:
            combust_reduction = 1/2.0
        reductions.append(combust_reduction)
            
        max_reduction = max(reductions) if reductions else 0.0
        
        final_years[p] = raw_years[p] * (1.0 - max_reduction)
        
    return final_years

# ============================================================================
# 1. Pindayu Calculation
# ============================================================================

def calculate_pindayu(planets_deg: Dict[str, float], lagna_deg: float) -> Dict[str, float]:
    """Calculate raw Pindayu years for each planet and Lagna."""
    years = {}
    for p in PLANETS:
        deg = planets_deg[p]
        debil = (EXALTATION_DEG[p] + 180.0) % 360.0
        diff = (deg - debil) % 360.0 # 0..360
        if diff > 180:
            diff = 360 - diff 
            
        max_y = PINDAYU_MAX_YEARS[p]
        min_y = max_y / 2.0
        
        years[p] = min_y + (diff / 180.0) * min_y

    # Lagna Contribution: Same as Amsayu (Navamsas passed)
    # BPHS 43.7: "The Lagna contributes years equal to the number of Navamsas passed."
    navamsa_span = 3 + (20.0/60.0)
    years[LAGNA] = lagna_deg / navamsa_span
        
    return years

# ============================================================================
# 2. Nisargayu Calculation
# ============================================================================

def calculate_nisargayu(planets_deg: Dict[str, float], lagna_deg: float) -> Dict[str, float]:
    """Calculate raw Nisargayu years."""
    years = {}
    for p in PLANETS:
        deg = planets_deg[p]
        debil = (EXALTATION_DEG[p] + 180.0) % 360.0
        diff = (deg - debil) % 360.0
        if diff > 180:
            diff = 360 - diff
            
        max_y = NISARGAYU_MAX_YEARS[p]
        min_y = max_y / 2.0 
        
        years[p] = min_y + (diff / 180.0) * min_y

    # Lagna Contribution: Same as Amsayu/Pindayu
    navamsa_span = 3 + (20.0/60.0)
    years[LAGNA] = lagna_deg / navamsa_span
        
    return years

# ============================================================================
# 3. Amsayu Calculation
# ============================================================================

def calculate_amsayu(planets_deg: Dict[str, float], lagna_deg: float) -> Dict[str, float]:
    """Calculate raw Amsayu (Navamsa) years.
    
    BPHS 45.2: "Count the number of Navamsas passed by the planet from Aries."
    "That number represents the years contributed."
    
    Logic:
    - Absolute position in zodiac / Length of Navamsa (3deg 20min).
    - Result is fractional years? Or integer?
    - Usually fractional.
    - Example: Planet at 10 deg Aries.
    - Navamsa length = 3.333 deg.
    - 10 / 3.333 = 3 full navamsas passed. (So 3 years?)
    - Plus fraction? "Navamsas passed" usually implies integer?
    - BPHS text implies exact precision. "Navamsa fraction".
    - Let's use float years = Total Longitude / (360/108)? No.
    - Navamsa span = 3°20' = 3.333°.
    - Amsayu = PlanetLongitude / 3.333? No.
    - BPHS: "The number of Navamsas from Aries... is the years."
    - Wait, Navamsas reset every sign? No, "from Aries" implies zodiacal.
    - But max years?
    - "If the count exceeds 12, deduct multiples of 12"?
    - Actually standard Amsayu = (Navamsas Passed from Aries). 
    - Max = 108 Navamsas in Zodiac. 108 Years.
    - But often it's modulo 12?
    - Let's check standard interpretation:
    - "Count from Aries" means from 0 degrees Aries.
    - Total degrees / 3.3333 = Years.
    - E.g. Sun at 357 deg (Pisces 27).
    - 357 / 3.333 = 107.1 years.
    - This fits the "108 years" human lifespan cap often cited.
    """
    years = {}
    
    # Calculate Lagna's contribution too?
    # BPHS 45.4: Lagna also contributes like a planet in Amsayu.
    items = planets_deg.copy()
    items[LAGNA] = lagna_deg
    
    navamsa_span = 3 + (20.0/60.0) # 3.333...
    
    for p, deg in items.items():
        # Years = degrees from 0 Aries / 3.333...
        y = deg / navamsa_span
        years[p] = y
        
    # We separate Lagna from planets dict usually, but here we can return it.
    # Caller needs to handle Lagna separately if doing reductions?
    # Reductions usually apply to planets. Lagna reduction logic is different (Krurodaya).
    # We'll leave Lagna in the dict.
    
    return years

def calculate_final_longevity(jd_ut: float, 
                             lagna_deg: float, 
                             planets_deg: Dict[str, float],
                             shadbala_rupas: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    """Calculate Final Validated Longevity.
    
    1. Compute Raw Pindayu, Nisargayu, Amsayu.
    2. Apply Haranas (Reductions) to each.
    3. Decide which system is primary (based on strength of Sun/Moon/Lagna).
    4. Return validation data.
    
    Selection Logic (BPHS 43.30-32):
    - If Sun is strongest -> Pindayu
    - If Moon is strongest -> Nisargayu
    - If Lagna Lord is strongest -> Amsayu
    """
    # 1. Get Speeds for Harana (Retrograde check)
    speeds = {}
    planet_ids = {
        SUN: swe.SUN, MOON: swe.MOON, MARS: swe.MARS, MERCURY: swe.MERCURY,
        JUPITER: swe.JUPITER, VENUS: swe.VENUS, SATURN: swe.SATURN
    }
    for p, pid in planet_ids.items():
        res = swe.calc_ut(jd_ut, pid)
        speeds[p] = res[0][3]
        
    # 2. Calculate Raw Years
    pindayu_raw = calculate_pindayu(planets_deg, lagna_deg)
    nisargayu_raw = calculate_nisargayu(planets_deg, lagna_deg)
    amsayu_raw = calculate_amsayu(planets_deg, lagna_deg) 
    
    # 3. Apply Haranas (Reductions)
    # Reductions apply to all systems usually, including Lagna (Krurodaya).
    
    pindayu_net = apply_haranas(pindayu_raw, planets_deg, lagna_deg, speeds)
    nisargayu_net = apply_haranas(nisargayu_raw, planets_deg, lagna_deg, speeds)
    amsayu_net = apply_haranas(amsayu_raw, planets_deg, lagna_deg, speeds)
    
    # Sums
    pindayu_total = sum(pindayu_net.values())
    nisargayu_total = sum(nisargayu_net.values())
    amsayu_total = sum(amsayu_net.values()) 
    
    # 4. Selection Logic (BPHS 43.30-32)
    selected_system = 'average' # Default if no Shadbala
    selection_scores = {}
    final_val = (pindayu_total + nisargayu_total + amsayu_total) / 3.0
    
    if shadbala_rupas:
        # Get Lagna Lord
        lagna_lord = get_sign_lord(lagna_deg)
        
        # Get strengths (Shadbala Rupas preferred, if passed)
        sun_strength = shadbala_rupas.get(SUN, 0.0)
        moon_strength = shadbala_rupas.get(MOON, 0.0)
        lagna_lord_strength = shadbala_rupas.get(lagna_lord, 0.0)
        
        selection_scores = {
            'sun': sun_strength,
            'moon': moon_strength,
            'lagna_lord': lagna_lord_strength,
            'lagna_lord_planet': lagna_lord
        }
        
        # Compare strengths
        # Default priority if equal: Sun > Moon > Lagna? BPHS doesn't explicitly state equality tie-break.
        # We use max.
        
        max_strength = max(sun_strength, moon_strength, lagna_lord_strength)
        
        if max_strength > 0:
            if max_strength == sun_strength:
                selected_system = 'pindayu'
                final_val = pindayu_total
            elif max_strength == moon_strength:
                selected_system = 'nisargayu'
                final_val = nisargayu_total
            else:
                selected_system = 'amsayu'
                final_val = amsayu_total
    
    return {
        'pindayu_years': round(pindayu_total, 2),
        'nisargayu_years': round(nisargayu_total, 2),
        'amsayu_years': round(amsayu_total, 2),
        'final_longevity': round(final_val, 2),
        'selected_system': selected_system,
        'selection_reason': selection_scores,
        'details': {
            'pindayu_raw': pindayu_raw,
            'pindayu_net': pindayu_net,
            'nisargayu_raw': nisargayu_raw,
            'nisargayu_net': nisargayu_net,
            'amsayu_raw': amsayu_raw,
            'amsayu_net': amsayu_net
        }
    }
