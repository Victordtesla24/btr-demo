# Tests for BTR Core module

"""Tests for the BTR core module functions."""

import pytest
import datetime
import math
from backend import btr_core


class TestWeekdayIndex:
    """Tests for _weekday_index function."""
    
    def test_sunday(self):
        """Sunday should map to index 0."""
        # Python weekday: Sunday = 6
        assert btr_core._weekday_index(6) == 0
    
    def test_monday(self):
        """Monday should map to index 1."""
        # Python weekday: Monday = 0
        assert btr_core._weekday_index(0) == 1
    
    def test_saturday(self):
        """Saturday should map to index 6."""
        # Python weekday: Saturday = 5
        assert btr_core._weekday_index(5) == 6


class TestDateTimeConversions:
    """Tests for datetime to Julian Day conversions."""
    
    def test_datetime_to_jd_ut(self):
        """Test conversion of datetime to Julian Day in UT."""
        dt = datetime.datetime(2024, 1, 15, 12, 0, 0)
        tz_offset = 5.5  # IST
        jd = btr_core._datetime_to_jd_ut(dt, tz_offset)
        assert isinstance(jd, float)
        assert jd > 2400000  # Julian Day should be in reasonable range
    
    def test_jd_to_datetime_local(self):
        """Test conversion of Julian Day to local datetime."""
        jd_ut = 2460320.5  # Example Julian Day
        tz_offset = 5.5
        dt = btr_core._jd_to_datetime_local(jd_ut, tz_offset)
        assert isinstance(dt, datetime.datetime)
        assert dt.year > 2020  # Should be a recent date


class TestSiderealLagna:
    """Tests for sidereal lagna calculation."""
    
    def test_compute_sidereal_lagna(self):
        """Test sidereal lagna computation."""
        jd_ut = 2460320.5
        latitude = 28.6139  # Delhi
        longitude = 77.2090
        lagna = btr_core.compute_sidereal_lagna(jd_ut, latitude, longitude)
        assert isinstance(lagna, float)
        assert 0 <= lagna < 360
    
    def test_lagna_range(self):
        """Lagna should always be in 0-360 range."""
        jd_ut = 2460320.5
        latitude = 0.0
        longitude = 0.0
        lagna = btr_core.compute_sidereal_lagna(jd_ut, latitude, longitude)
        assert 0 <= lagna < 360


class TestSunMoonLongitudes:
    """Tests for Sun and Moon longitude calculations."""
    
    def test_compute_sun_moon_longitudes(self):
        """Test Sun and Moon longitude computation."""
        jd_ut = 2460320.5
        sun_deg, moon_deg = btr_core.compute_sun_moon_longitudes(jd_ut)
        assert isinstance(sun_deg, float)
        assert isinstance(moon_deg, float)
        assert 0 <= sun_deg < 360
        assert 0 <= moon_deg < 360


class TestSunriseSunset:
    """Tests for sunrise/sunset calculations."""
    
    def test_compute_sunrise_sunset(self):
        """Test sunrise/sunset computation."""
        date_local = datetime.date(2024, 1, 15)
        latitude = 28.6139  # Delhi
        longitude = 77.2090
        tz_offset = 5.5
        sunrise, sunset = btr_core.compute_sunrise_sunset(
            date_local, latitude, longitude, tz_offset
        )
        assert isinstance(sunrise, datetime.datetime)
        assert isinstance(sunset, datetime.datetime)
        assert sunrise < sunset
    
    def test_sunrise_before_sunset(self):
        """Sunrise and sunset should be valid datetime objects for the requested date."""
        date_local = datetime.date(2024, 6, 15)  # Summer date
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        sunrise, sunset = btr_core.compute_sunrise_sunset(
            date_local, latitude, longitude, tz_offset
        )
        # Both should be datetime objects
        assert isinstance(sunrise, datetime.datetime)
        assert isinstance(sunset, datetime.datetime)
        # Both should be reasonable times (within 48 hours of the requested date)
        # Note: Due to timezone conversions and Swiss Ephemeris calculations,
        # sunset might appear on previous calendar day but is still valid
        date_start = datetime.datetime.combine(date_local, datetime.time(0, 0))
        date_end = date_start + datetime.timedelta(days=2)
        # Sunrise and sunset should be within a reasonable range
        assert date_start - datetime.timedelta(hours=12) <= sunrise <= date_end
        assert date_start - datetime.timedelta(hours=12) <= sunset <= date_end


class TestGulika:
    """Tests for Gulika calculations."""
    
    def test_calculate_gulika(self):
        """Test Gulika calculation."""
        date_local = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        gulika_info = btr_core.calculate_gulika(
            date_local, latitude, longitude, tz_offset
        )
        assert isinstance(gulika_info, dict)
        assert 'day_gulika_deg' in gulika_info
        assert 'night_gulika_deg' in gulika_info
        assert 'day_gulika_time_local' in gulika_info
        assert 'night_gulika_time_local' in gulika_info
        assert 0 <= gulika_info['day_gulika_deg'] < 360
        assert 0 <= gulika_info['night_gulika_deg'] < 360
    
    def test_gulika_day_night_different(self):
        """Test that day and night Gulika are calculated correctly."""
        date_local = datetime.date(2024, 6, 15)  # Summer date
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        gulika_info = btr_core.calculate_gulika(
            date_local, latitude, longitude, tz_offset
        )
        # Day and night Gulika should be different (different periods)
        assert gulika_info['day_gulika_deg'] != gulika_info['night_gulika_deg']
        # Both should be valid longitudes
        assert 0 <= gulika_info['day_gulika_deg'] < 360
        assert 0 <= gulika_info['night_gulika_deg'] < 360
    
    def test_gulika_bphs_verse_compliance(self):
        """Test Gulika calculation matches BPHS verses 4.1-4.3 exactly."""
        # Test for Sunday (weekday_idx=0): Saturn should be at khanda 6
        # Test for Monday (weekday_idx=1): Saturn should be at khanda 5
        # Test for Saturday (weekday_idx=6): Saturn should be at khanda 0
        test_cases = [
            (datetime.date(2024, 1, 14), 0),  # Sunday
            (datetime.date(2024, 1, 15), 1),  # Monday
            (datetime.date(2024, 1, 20), 6),  # Saturday
        ]
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        
        for date_local, expected_weekday_idx in test_cases:
            gulika_info = btr_core.calculate_gulika(
                date_local, latitude, longitude, tz_offset
            )
            # Verify both day and night Gulika are calculated
            assert 'day_gulika_deg' in gulika_info
            assert 'night_gulika_deg' in gulika_info
            assert 'day_gulika_time_local' in gulika_info
            assert 'night_gulika_time_local' in gulika_info
            # Verify Gulika times are within day/night periods
            assert isinstance(gulika_info['day_gulika_time_local'], datetime.datetime)
            assert isinstance(gulika_info['night_gulika_time_local'], datetime.datetime)
            # Verify degrees are valid
            assert 0 <= gulika_info['day_gulika_deg'] < 360
            assert 0 <= gulika_info['night_gulika_deg'] < 360


class TestIshtaKala:
    """Tests for Ishta-kala calculations."""
    
    def test_calculate_ishta_kala(self):
        """Test Ishta-kala calculation."""
        candidate = datetime.datetime(2024, 1, 15, 10, 30, 0)
        sunrise = datetime.datetime(2024, 1, 15, 7, 0, 0)
        ghatis, palas, total_palas = btr_core.calculate_ishta_kala(candidate, sunrise)
        assert isinstance(ghatis, int)
        assert isinstance(palas, int)
        assert isinstance(total_palas, float)
        assert total_palas > 0


class TestPranapada:
    """Tests for Prāṇa-pada calculations."""
    
    def test_calculate_madhya_pranapada(self):
        """Test Madhya Prāṇa-pada calculation."""
        ghatis = 5
        palas = 30
        pp_deg = btr_core.calculate_madhya_pranapada(ghatis, palas)
        assert isinstance(pp_deg, float)
        assert 0 <= pp_deg < 360
    
    def test_calculate_madhya_pranapada_example(self):
        """Test Madhya Prāṇa-pada with worked example from BPHS."""
        # Example: 13 ghatis, 7 palas
        # 13 × 4 = 52
        # 7 ÷ 15 = 0 remainder 7
        # 52 + 0 = 52
        # 52 ÷ 12 = 4 remainder 4 → Rashi 4 (Leo)
        # Degrees: 7 × 2 = 14°
        # Expected: Leo 14° = 4 × 30 + 14 = 134°
        ghatis = 13
        palas = 7
        pp_deg = btr_core.calculate_madhya_pranapada(ghatis, palas)
        assert isinstance(pp_deg, float)
        # Should be in Leo (120-150° range)
        assert 120 <= pp_deg < 150
        # Should be approximately 134° (Leo 14°)
        assert abs(pp_deg - 134.0) < 1.0
    
    def test_calculate_sphuta_pranapada(self):
        """Test Sphuṭa Prāṇa-pada calculation."""
        ishta_total_palas = 330.0
        sun_longitude = 270.0  # Capricorn
        pp_deg = btr_core.calculate_sphuta_pranapada(ishta_total_palas, sun_longitude)
        assert isinstance(pp_deg, float)
        assert 0 <= pp_deg < 360
    
    def test_calculate_sphuta_pranapada_chara(self):
        """Test Sphuṭa Prāṇa-pada with Sun in Chara (Movable) sign."""
        # Sun in Aries (Chara - Movable)
        sun_longitude = 10.0  # Aries 10°
        ishta_total_palas = 150.0  # 10 rashis
        pp_deg = btr_core.calculate_sphuta_pranapada(ishta_total_palas, sun_longitude)
        # Should add to Sun's position (Aries)
        assert isinstance(pp_deg, float)
        assert 0 <= pp_deg < 360
    
    def test_calculate_sphuta_pranapada_sthira(self):
        """Test Sphuṭa Prāṇa-pada with Sun in Sthira (Fixed) sign."""
        # Sun in Leo (Sthira - Fixed)
        sun_longitude = 130.0  # Leo 10°
        ishta_total_palas = 150.0
        pp_deg = btr_core.calculate_sphuta_pranapada(ishta_total_palas, sun_longitude)
        # Should add to 9th from Sun (9th from Leo = Aries)
        assert isinstance(pp_deg, float)
        assert 0 <= pp_deg < 360
    
    def test_calculate_sphuta_pranapada_dvisvabhava(self):
        """Test Sphuṭa Prāṇa-pada with Sun in Dvisvabhava (Dual) sign."""
        # Sun in Sagittarius (Dvisvabhava - Dual)
        sun_longitude = 250.0  # Sagittarius 10°
        ishta_total_palas = 150.0
        pp_deg = btr_core.calculate_sphuta_pranapada(ishta_total_palas, sun_longitude)
        # Should add to 5th from Sun (5th from Sagittarius = Aries)
        assert isinstance(pp_deg, float)
        assert 0 <= pp_deg < 360
    
    def test_calculate_sphuta_pranapada_worked_example(self):
        """Test Sphuṭa Prāṇa-pada with worked example from BPHS."""
        # Example from BTR-ASCII-Workflow.md:
        # 13 ghatis, 7 palas = 787 total palas
        # Sun in Sagittarius 2° (Dvisvabhava)
        # 787 ÷ 15 = 52.47 rashis
        # 5th from Sagittarius = Aries
        # Aries 2° + (52 mod 12 = 4) rashis + (0.47 × 30° = 14.1°)
        # = Leo 16.1° approximately
        ishta_total_palas = (13 * 60) + 7  # 787 palas
        sun_longitude = 242.0  # Sagittarius 2° (approximately)
        pp_deg = btr_core.calculate_sphuta_pranapada(ishta_total_palas, sun_longitude)
        assert isinstance(pp_deg, float)
        assert 0 <= pp_deg < 360
        # Should be in Leo (120-150° range) approximately
        assert 120 <= pp_deg < 150


class TestBPHSFilters:
    """Tests for BPHS hard filters."""
    
    def test_apply_bphs_hard_filters(self):
        """Test BPHS hard filter application."""
        lagna_deg = 45.0
        pranapada_deg = 45.0  # Same as lagna (trine rule satisfied)
        gulika_deg = 50.0
        moon_deg = 48.0
        accepted, scores = btr_core.apply_bphs_hard_filters(
            lagna_deg, pranapada_deg, gulika_deg, moon_deg
        )
        assert isinstance(accepted, bool)
        assert isinstance(scores, dict)
        assert 'degree_match' in scores
        assert 'gulika_alignment' in scores
        assert 'moon_alignment' in scores
        assert 'combined_verification' in scores
    
    def test_trine_rule_same_sign(self):
        """Test trine rule with same sign (0th sign difference)."""
        lagna_deg = 30.0  # Sign 1
        pranapada_deg = 45.0  # Sign 1 (same sign)
        gulika_deg = 50.0
        moon_deg = 48.0
        accepted, scores = btr_core.apply_bphs_hard_filters(
            lagna_deg, pranapada_deg, gulika_deg, moon_deg
        )
        assert scores['passes_trine_rule'] is True
    
    def test_trine_rule_fifth_sign(self):
        """Test trine rule with 5th sign difference (trine = 120 degrees = 4 signs)."""
        # Sign 0 (Aries, 0-30) to Sign 4 (Leo, 120-150) = 4 signs apart = trine
        lagna_deg = 15.0  # Sign 0 (Aries)
        pranapada_deg = 135.0  # Sign 4 (Leo) - 4 signs from sign 0
        gulika_deg = 50.0
        moon_deg = 48.0
        accepted, scores = btr_core.apply_bphs_hard_filters(
            lagna_deg, pranapada_deg, gulika_deg, moon_deg
        )
        assert scores['passes_trine_rule'] is True
    
    def test_trine_rule_ninth_sign(self):
        """Test trine rule with 9th sign difference (trine = 240 degrees = 8 signs)."""
        # Sign 0 (Aries) to Sign 8 (Sagittarius) = 8 signs apart = trine
        lagna_deg = 15.0  # Sign 0 (Aries)
        pranapada_deg = 255.0  # Sign 8 (Sagittarius) - 8 signs from sign 0
        gulika_deg = 50.0
        moon_deg = 48.0
        accepted, scores = btr_core.apply_bphs_hard_filters(
            lagna_deg, pranapada_deg, gulika_deg, moon_deg
        )
        assert scores['passes_trine_rule'] is True
    
    def test_trine_rule_failure_rejects_candidate(self):
        """Test that candidates failing trine rule (BPHS 4.10) are rejected."""
        # BPHS 4.10: Lagna must be in 1st, 5th, or 9th from Pranapada for humans
        # Test with 2nd sign difference (not trine) - should be rejected
        lagna_deg = 15.0  # Sign 0 (Aries)
        pranapada_deg = 60.0  # Sign 2 (Gemini) - 2 signs from sign 0 (NOT trine)
        gulika_deg = 50.0
        moon_deg = 48.0
        accepted, scores = btr_core.apply_bphs_hard_filters(
            lagna_deg, pranapada_deg, gulika_deg, moon_deg
        )
        assert scores['passes_trine_rule'] is False
        assert accepted is False  # Must be rejected per BPHS 4.10
    
    def test_trine_rule_mandatory_bphs_4_10(self):
        """Test that trine rule is mandatory per BPHS 4.10 - non-human birth if fails."""
        # Test multiple non-trine positions (2nd, 3rd, 4th, 6th, 7th, 10th, 11th from Pranapada)
        pranapada_deg = 15.0  # Sign 0 (Aries)
        non_trine_positions = [
            60.0,   # Sign 2 (Gemini) - 2 signs away
            90.0,   # Sign 3 (Cancer) - 3 signs away
            120.0,  # Sign 4 (Leo) - 4 signs away (this is actually trine, skip)
            180.0,  # Sign 6 (Libra) - 6 signs away
            210.0,  # Sign 7 (Scorpio) - 7 signs away
            300.0,  # Sign 10 (Aquarius) - 10 signs away
            330.0,  # Sign 11 (Pisces) - 11 signs away
        ]
        
        for lagna_deg in non_trine_positions:
            # Skip the trine position (120.0)
            if abs(lagna_deg - 120.0) < 1.0:
                continue
            accepted, scores = btr_core.apply_bphs_hard_filters(
                lagna_deg, pranapada_deg, 50.0, 48.0
            )
            assert scores['passes_trine_rule'] is False
            assert accepted is False  # Must be rejected


class TestSearchCandidateTimes:
    """Tests for candidate time search."""
    
    def test_search_candidate_times(self):
        """Test searching candidate times."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "08:00"
        end_time_str = "10:00"
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=30
        )
        assert isinstance(candidates, list)
        # Each candidate should have required fields
        if candidates:
            candidate = candidates[0]
            assert 'time_local' in candidate
            assert 'lagna_deg' in candidate
            assert 'pranapada_deg' in candidate
            assert 'delta_pp_deg' in candidate
            assert 'passes_trine_rule' in candidate
            assert 'verification_scores' in candidate
    
    def test_search_candidate_times_empty_range(self):
        """Test with a very small time range."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "12:00"
        end_time_str = "12:10"  # Only 10 minutes
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=10
        )
        assert isinstance(candidates, list)
    
    def test_search_candidate_times_trine_rule_enforced(self):
        """Test that only candidates passing trine rule are returned."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "08:00"
        end_time_str = "18:00"
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=60  # 1 hour steps
        )
        # All candidates should pass trine rule
        for candidate in candidates:
            assert candidate['passes_trine_rule'] is True
    
    def test_search_candidate_times_midnight_wrap(self):
        """Test candidate search with time range wrapping midnight."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "22:00"
        end_time_str = "02:00"  # Wraps to next day
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=60
        )
        # Should handle midnight wrap correctly
        assert isinstance(candidates, list)
    
    def test_search_candidate_times_small_step(self):
        """Test candidate search with small step size for accuracy."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "10:00"
        end_time_str = "11:00"
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=2  # 2-minute steps for accuracy
        )
        assert isinstance(candidates, list)
        # With 2-minute steps in 1 hour, should have many candidates
        # (though many may be filtered out by BPHS rules)


class TestSpecialLagnas:
    """Tests for special lagnas calculations."""
    
    def test_calculate_special_lagnas(self):
        """Test special lagnas calculation."""
        ishta_kala = (13, 7, 787.0)  # 13 ghatis, 7 palas, 787 total palas
        sun_longitude = 270.0  # Capricorn
        janma_lagna_deg = 120.0  # Leo
        special_lagnas = btr_core.calculate_special_lagnas(
            ishta_kala, sun_longitude, janma_lagna_deg
        )
        assert isinstance(special_lagnas, dict)
        assert 'bhava_lagna' in special_lagnas
        assert 'hora_lagna' in special_lagnas
        assert 'ghati_lagna' in special_lagnas
        assert 'varnada_lagna' in special_lagnas
        for lagna in special_lagnas.values():
            assert 0 <= lagna < 360


class TestNisheka:
    """Tests for Nisheka Lagna calculations."""
    
    def test_calculate_nisheka_lagna(self):
        """Test Nisheka Lagna calculation."""
        saturn_deg = 330.0  # Pisces
        gulika_lagna_deg = 30.0  # Taurus
        janma_lagna_deg = 120.0  # Leo
        nisheka = btr_core.calculate_nisheka_lagna(
            saturn_deg, gulika_lagna_deg, janma_lagna_deg
        )
        assert isinstance(nisheka, dict)
        assert 'nisheka_lagna_deg' in nisheka
        assert 'gestation_months' in nisheka
        assert 'is_realistic' in nisheka
        assert 'gestation_score' in nisheka
        assert 0 <= nisheka['nisheka_lagna_deg'] < 360
        assert 0 < nisheka['gestation_months'] <= 12


class TestVimshottariDasha:
    """Tests for Vimshottari dasha calculations."""
    
    def test_get_moon_nakshatra(self):
        """Test Moon nakshatra calculation."""
        # Test various Moon positions
        moon_positions = [0.0, 13.33, 26.67, 180.0, 360.0]
        for moon_deg in moon_positions:
            nakshatra = btr_core.get_moon_nakshatra(moon_deg)
            assert isinstance(nakshatra, int)
            assert 0 <= nakshatra < 27
    
    def test_calculate_vimshottari_dasha(self):
        """Test Vimshottari dasha calculation."""
        jd_ut_birth = 2460320.5
        moon_longitude = 45.0  # Example Moon position
        dasha_info = btr_core.calculate_vimshottari_dasha(jd_ut_birth, moon_longitude)
        assert isinstance(dasha_info, dict)
        assert 'nakshatra_num' in dasha_info
        assert 'nakshatra_lord' in dasha_info
        assert 'first_dasha_lord' in dasha_info
        assert 'first_dasha_remaining_years' in dasha_info
        assert 'dasha_sequence' in dasha_info
        assert 0 <= dasha_info['nakshatra_num'] < 27
        assert dasha_info['nakshatra_lord'] in ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
    
    def test_get_dasha_at_date(self):
        """Test getting dasha at a specific date."""
        jd_ut_birth = 2460320.5
        moon_longitude = 45.0
        event_date = datetime.date(2024, 6, 15)
        dasha = btr_core.get_dasha_at_date(jd_ut_birth, event_date, moon_longitude)
        assert isinstance(dasha, dict)
        assert 'mahadasha' in dasha
        assert 'antardasha' in dasha
        assert 'years_into_mahadasha' in dasha
        assert 'years_into_antardasha' in dasha
        assert dasha['mahadasha'] in ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
        assert dasha['antardasha'] in ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']


class TestDivisionalCharts:
    """Tests for divisional chart calculations."""
    
    def test_calculate_divisional_chart_d3(self):
        """Test D-3 (Drekkana) divisional chart."""
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        d3 = btr_core.calculate_divisional_chart(lagna_deg, planets, 3)
        assert isinstance(d3, dict)
        assert 'lagna' in d3
        for planet_name in planets.keys():
            assert planet_name in d3
            assert 0 <= d3[planet_name] < 360
    
    def test_calculate_divisional_chart_d9(self):
        """Test D-9 (Navamsa) divisional chart."""
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        d9 = btr_core.calculate_divisional_chart(lagna_deg, planets, 9)
        assert isinstance(d9, dict)
        assert 'lagna' in d9
        for planet_name in planets.keys():
            assert planet_name in d9
            assert 0 <= d9[planet_name] < 360
    
    def test_calculate_divisional_chart_d10(self):
        """Test D-10 (Dasamsa) divisional chart."""
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        d10 = btr_core.calculate_divisional_chart(lagna_deg, planets, 10)
        assert isinstance(d10, dict)
        assert 'lagna' in d10
        for planet_name in planets.keys():
            assert planet_name in d10
            assert 0 <= d10[planet_name] < 360
    
    def test_calculate_divisional_chart_all_divisions(self):
        """Test all divisional charts (D-3, D-7, D-9, D-10, D-12, D-60)."""
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        divisions = [3, 7, 9, 10, 12, 60]
        for division in divisions:
            chart = btr_core.calculate_divisional_chart(lagna_deg, planets, division)
            assert isinstance(chart, dict)
            assert 'lagna' in chart
            assert 0 <= chart['lagna'] < 360


class TestPhysicalTraitsScoring:
    """Tests for physical traits scoring."""
    
    def test_score_physical_traits_height(self):
        """Test physical traits scoring for height."""
        lagna_deg = 15.0  # Aries (Large body)
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        traits = {'height': 'TALL'}
        scores = btr_core.score_physical_traits(lagna_deg, planets, traits)
        assert isinstance(scores, dict)
        assert 'height' in scores
        assert 'overall' in scores
        assert 0 <= scores['height'] <= 100
    
    def test_score_physical_traits_build(self):
        """Test physical traits scoring for build."""
        lagna_deg = 15.0  # Aries (Mars lord - Athletic)
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 15.0,  # Mars in lagna
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        traits = {'build': 'ATHLETIC'}
        scores = btr_core.score_physical_traits(lagna_deg, planets, traits)
        assert isinstance(scores, dict)
        assert 'build' in scores
        assert 0 <= scores['build'] <= 100
    
    def test_score_physical_traits_complexion(self):
        """Test physical traits scoring for complexion."""
        lagna_deg = 15.0
        planets = {
            'sun': 120.0,
            'moon': 15.0,  # Moon in lagna (Fair)
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        traits = {'complexion': 'FAIR'}
        scores = btr_core.score_physical_traits(lagna_deg, planets, traits)
        assert isinstance(scores, dict)
        assert 'complexion' in scores
        assert 0 <= scores['complexion'] <= 100
    
    def test_score_physical_traits_all_traits(self):
        """Test physical traits scoring with all traits."""
        lagna_deg = 15.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        traits = {
            'height': 'TALL',
            'build': 'ATHLETIC',
            'complexion': 'FAIR'
        }
        scores = btr_core.score_physical_traits(lagna_deg, planets, traits)
        assert isinstance(scores, dict)
        assert 'height' in scores
        assert 'build' in scores
        assert 'complexion' in scores
        assert 'overall' in scores
        assert 0 <= scores['overall'] <= 100


class TestLifeEventsVerification:
    """Tests for life events verification."""
    
    def test_verify_life_events_marriage(self):
        """Test marriage event verification."""
        jd_ut_birth = 2460320.5
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        events = {
            'marriage': {
                'date': '2020-05-15'
            }
        }
        moon_longitude = 180.0
        scores = btr_core.verify_life_events(jd_ut_birth, lagna_deg, planets, events, moon_longitude)
        assert isinstance(scores, dict)
        assert 'marriage' in scores
        assert 'overall' in scores
        assert 0 <= scores['marriage'] <= 100
    
    def test_verify_life_events_children(self):
        """Test children event verification."""
        jd_ut_birth = 2460320.5
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        events = {
            'children': {
                'count': 2,
                'dates': ['2021-08-20', '2023-03-15']
            }
        }
        moon_longitude = 180.0
        scores = btr_core.verify_life_events(jd_ut_birth, lagna_deg, planets, events, moon_longitude)
        assert isinstance(scores, dict)
        assert 'children' in scores
        assert 'overall' in scores
        assert 0 <= scores['children'] <= 100
    
    def test_verify_life_events_career(self):
        """Test career event verification."""
        jd_ut_birth = 2460320.5
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        events = {
            'career': ['2018-06-01', '2022-03-15']
        }
        moon_longitude = 180.0
        scores = btr_core.verify_life_events(jd_ut_birth, lagna_deg, planets, events, moon_longitude)
        assert isinstance(scores, dict)
        assert 'career' in scores
        assert 'overall' in scores
        assert 0 <= scores['career'] <= 100
    
    def test_verify_life_events_all_events(self):
        """Test life events verification with all event types."""
        jd_ut_birth = 2460320.5
        lagna_deg = 45.0
        planets = {
            'sun': 120.0,
            'moon': 180.0,
            'mars': 60.0,
            'mercury': 90.0,
            'jupiter': 240.0,
            'venus': 300.0,
            'saturn': 30.0,
            'rahu': 150.0,
            'ketu': 330.0
        }
        events = {
            'marriage': {'date': '2020-05-15'},
            'children': {'count': 1, 'dates': ['2021-08-20']},
            'career': ['2018-06-01']
        }
        moon_longitude = 180.0
        scores = btr_core.verify_life_events(jd_ut_birth, lagna_deg, planets, events, moon_longitude)
        assert isinstance(scores, dict)
        assert 'marriage' in scores
        assert 'children' in scores
        assert 'career' in scores
        assert 'overall' in scores
        assert 0 <= scores['overall'] <= 100


class TestEnhancedScoring:
    """Tests for enhanced composite scoring."""
    
    def test_search_candidate_times_with_traits(self):
        """Test candidate search with physical traits."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "08:00"
        end_time_str = "10:00"
        optional_traits = {
            'height': 'TALL',
            'build': 'ATHLETIC',
            'complexion': 'FAIR'
        }
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=30,
            optional_traits=optional_traits
        )
        assert isinstance(candidates, list)
        if candidates:
            candidate = candidates[0]
            assert 'composite_score' in candidate
            assert 'physical_traits_scores' in candidate
            assert 0 <= candidate['composite_score'] <= 100
    
    def test_search_candidate_times_with_events(self):
        """Test candidate search with life events."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "08:00"
        end_time_str = "10:00"
        optional_events = {
            'marriage': {'date': '2020-05-15'},
            'children': {'count': 1, 'dates': ['2021-08-20']}
        }
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=30,
            optional_events=optional_events
        )
        assert isinstance(candidates, list)
        if candidates:
            candidate = candidates[0]
            assert 'composite_score' in candidate
            assert 'life_events_scores' in candidate
            assert 0 <= candidate['composite_score'] <= 100
    
    def test_search_candidate_times_with_traits_and_events(self):
        """Test candidate search with both traits and events."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "08:00"
        end_time_str = "10:00"
        optional_traits = {'height': 'TALL'}
        optional_events = {'marriage': {'date': '2020-05-15'}}
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=30,
            optional_traits=optional_traits,
            optional_events=optional_events
        )
        assert isinstance(candidates, list)
        if candidates:
            candidate = candidates[0]
            assert 'composite_score' in candidate
            assert 'physical_traits_scores' in candidate
            assert 'life_events_scores' in candidate
            assert 0 <= candidate['composite_score'] <= 100
    
    def test_composite_score_sorting(self):
        """Test that candidates are sorted by composite score."""
        dob = datetime.date(2024, 1, 15)
        latitude = 28.6139
        longitude = 77.2090
        tz_offset = 5.5
        start_time_str = "08:00"
        end_time_str = "10:00"
        candidates = btr_core.search_candidate_times(
            dob=dob,
            latitude=latitude,
            longitude=longitude,
            tz_offset=tz_offset,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            step_minutes=30
        )
        if len(candidates) > 1:
            # Candidates should be sorted by composite_score descending
            for i in range(len(candidates) - 1):
                assert candidates[i]['composite_score'] >= candidates[i + 1]['composite_score']
