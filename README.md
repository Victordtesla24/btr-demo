# BPHS Birth Time Rectification (BTR) Prototype

A minimal but accurate web application for Birth Time Rectification based strictly on **Brihat Parashara Hora Shastra (BPHS)** verses from Chapter 4 - लग्नाध्याय (Lagna Adhyaya).

## Overview

This prototype implements the canonical BPHS-based rectification methods strictly following **Brihat Parashara Hora Shastra (BPHS)** Chapter 4 - लग्नाध्याय (Lagna Adhyaya). **Only rules explicitly appearing in these verses are used** - no other texts, commentaries, or invented rules.

### Complete BPHS Verse Implementation List

#### Chapter 4: लग्नाध्याय (Lagna Adhyaya)

**Section 1: Gulika Calculation (गुलिक गणना)**
- **BPHS 4.1**: रविवारादिशन्यन्तं गुलिकादि निरूप्यते। दिवसानष्टधा कृत्वा वारेशाद्मणयेत््रमात्।
  - Divide day duration into 8 parts, count from weekday lord
- **BPHS 4.2**: अष्छ्मषो निरीशः स्याच्छन्यंशो गुरिकः स्मृतः। रात्रिरष्यष्टधा भक्त्वा वःरर््पञ्चनादतः।
  - 8th portion has no lord (Niresha); Saturn's portion = Gulika. For night, count from 5th weekday lord
- **BPHS 4.3**: शन्यशो गुलिकः प्रोक्तो गुर्वंशो यमघण्टकः।
  - Saturn's portion = Gulika, Jupiter's portion = Yamaghantaka

**Section 2: Pranapada Calculation (प्राणपद गणना)**
- **BPHS 4.5**: घटी चतुर्गुणा कार्यां तिथ्याप्तैश्च पलैर्युताः। दिनकरेणापहतं शेषं प्राणपदं स्मृतम्।
  - **Madhya Pranapada (Rough)**: Multiply ghatis × 4, add palas ÷ 15, divide by 12
- **BPHS 4.6**: शेषात्यलान्तादिहवगुणी विधाय राश्यंशसूर्यक्षनियोजिताच। तत्रापि तद्राशिच्छान् क्रमेण लग्न साशपदेक्यता स्यात्।
  - **Degree Matching**: Lagna degrees and Pranapada degrees should be equal (पदैक्यता)
- **BPHS 4.7**: अथच--स्वेष्टकालं पलीकृत्य तिथ्याप्तं भादिकं च यत्। चरागद्विभके भानौ योज्यं स्वे नवमे सुते।
  - **Sphuta Pranapada (Accurate)**: Convert to palas, divide by 15, add based on Sun's rashi nature (Chara/Sthira/Dvisvabhava)
- **BPHS 4.8**: विना प्राणपदाच्छुद्धो गुलिकाद्वा निशाकराद्। तदशद्धं विजानीयात्स्थावराणां तदेव हि।
  - **Triple Verification**: Must be verified by Pranapada OR Gulika OR Moon
- **BPHS 4.10**: प्राणपदं को राशि से त्रिकोण राशि मे मनुष्यों के जन्मलग्न की राशि होती है।
  - **Trine Rule (MANDATORY)**: Birth lagna must be in trine (1st, 5th, or 9th) from Pranapada for humans
- **BPHS 4.11**: तृतीये मदने लाभे विहङ्गानां विनिदिशेत्।
  - Confirms that only 1st/5th/9th positions from Pranapada apply to humans

**Section 3: Special Lagnas (विशेष लग्न)**
- **BPHS 4.18**: सूर्योदयात्समारभ्य घटीपञ्च प्रमाणतः। जन्मेष्टकालपर्यन्तं गणनीयं प्रयत्नतः।
  - **Bhava Lagna**: Every 5 ghatis = 1 sign progression
- **BPHS 4.20-21**: सार्धद्विष्ठटिक्छा विप्र कालादिति विलग्नभात्।
  - **Hora Lagna**: Every 2.5 ghatis = 1 sign progression
- **BPHS 4.22-24**: सूर्योदयात्समारभ्य जन्मकालावधि क्रमात्। एकैकं घटिकांमानांल्लग्नं राश्यादिकं च यत्।
  - **Ghati Lagna**: 1 ghati = 1 sign (30°), 1 pala = 2 degrees
- **BPHS 4.26-28**: जन्महोराख्यलग्नक्षसंख्या ग्राह्या पृथक् पृथक्। ओजे लग्ने त्वेकयुग्मे चक्रशुद्धैकसंयुता।
  - **Varnada Lagna**: Complex calculation from Janma + Hora lagnas

**Section 4: Nisheka Lagna (निषेक लग्न)**
- **BPHS 4.12-16**: Conception time calculation
- **BPHS 4.14**: यस्मिन् भावे स्थितो कोणस्तस्य मान्देर्यदन्तरम्। लग्नभाग्यन्तरं योज्यं यच्च राश्यादि जायते।
  - Calculate gestation period using Saturn, Gulika, and 9th house

**Additional BPHS References:**
- **BPHS Chapter 2**: Physical traits by lagna sign and planets (Verses 2.3-2.23)
- **BPHS Chapter 12**: Life events timing and verification (Verses 12.23, 12.35, 12.206, 12.211)
- **Vimshottari Dasha**: Primary dasha system mentioned throughout BPHS

### Implementation Summary

1. **Gulika Calculation** (BPHS 4.1-4.3) - Primary verification method
2. **Pranapada Calculation** (BPHS 4.5, 4.7) - Primary rectification metric
   - Method 1: Madhya Pranapada (Rough) - BPHS 4.5
   - Method 2: Sphuta Pranapada (Accurate) - BPHS 4.7 - **Used for rectification**
3. **Hard BPHS Filters**:
   - Trine Rule (BPHS 4.10) - **Mandatory** for human births
   - Degree Matching (BPHS 4.6)
   - Triple Verification (BPHS 4.8)
4. **Special Lagnas** (BPHS 4.18-28) - Secondary verification
   - Bhava Lagna (BPHS 4.18)
   - Hora Lagna (BPHS 4.20-21)
   - Ghati Lagna (BPHS 4.22-24)
   - Varnada Lagna (BPHS 4.26-28)
5. **Nisheka Lagna** (BPHS 4.12-16) - Gestation verification
6. **Vimshottari Dasha** - Life events timing verification
7. **Divisional Charts** (D-3, D-7, D-9, D-10, D-12, D-60) - Event verification
8. **Physical Traits Scoring** (BPHS Chapter 2) - Height, build, complexion matching
9. **Life Events Verification** - Marriage, children, career timing validation
10. **Enhanced Composite Scoring** - Weighted scoring incorporating all factors

## Architecture

- **Backend**: Python 3.10+ with FastAPI
- **Astro Engine**: Swiss Ephemeris (pyswisseph) with Lahiri Ayanamsa
- **Geocoding**: OpenCage API
- **Frontend**: React + TypeScript (Vite)

## Installation

### Prerequisites

- Python 3.10 or higher
- Node.js 18+ and npm (for frontend)
- OpenCage API key ([Get one here](https://opencagedata.com/api))

### Local Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd btr-demo
```

2. **Create a virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Create `.env` file** in the root directory:
```bash
OPENCAGE_API_KEY=your_api_key_here
EPHE_PATH=  # Optional: path to Swiss Ephemeris data files
```

5. **Run the backend server**:
```bash
uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`

6. **Set up and run the frontend**:
```bash
cd frontend-react
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` (Vite default port)

**Note**: The frontend proxies API requests to `http://localhost:8000` automatically.

## API Endpoints

### GET `/api/geocode?q=<place>`

Geocode a place name to get latitude/longitude using OpenCage API.

**Example**:
```bash
curl "http://localhost:8000/api/geocode?q=Sialkot,%20Pakistan"
```

**Response**:
```json
{
  "lat": 32.4945,
  "lon": 74.5229,
  "formatted": "Sialkot, Punjab, Pakistan"
}
```

**Error Responses**:
- `404`: Location not found
- `500`: OpenCage API key not configured or API error

### POST `/api/btr`

Perform birth time rectification using BPHS methods.

**Request Body** (all fields required except optional_*):
```json
{
  "dob": "1997-12-18",
  "pob_text": "Sialkot, Pakistan",
  "tz_offset_hours": 5.0,
  "approx_tob": {
    "mode": "unknown",
    "center": null,
    "window_hours": null
  },
  "time_range_override": null,
  "optional_traits": {
    "height": "TALL",
    "build": "ATHLETIC",
    "complexion": "WHEATISH"
  },
  "optional_events": {
    "marriage": {
      "date": "2020-05-15"
    },
    "children": {
      "count": 1,
      "dates": ["2021-08-20"]
    },
    "career": ["2018-06-01", "2022-03-15"]
  }
}
```

**Request with approximate time**:
```json
{
  "dob": "1997-12-18",
  "pob_text": "Delhi, India",
  "tz_offset_hours": 5.5,
  "approx_tob": {
    "mode": "approx",
    "center": "11:00",
    "window_hours": 3.0
  },
  "time_range_override": null,
  "optional_traits": null,
  "optional_events": null
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/btr \
  -H "Content-Type: application/json" \
  -d '{
    "dob": "1997-12-18",
    "pob_text": "Sialkot, Pakistan",
    "tz_offset_hours": 5.0,
    "approx_tob": {
      "mode": "approx",
      "center": "11:00",
      "window_hours": 3.0
    }
  }'
```

**Response**:
```json
{
  "engine_version": "bphs-btr-prototype-v1",
  "geocode": {
    "lat": 32.4945,
    "lon": 74.5229,
    "formatted": "Sialkot, Punjab, Pakistan"
  },
  "search_config": {
    "step_minutes": 10,
    "time_window_used": {
      "start_local": "08:00",
      "end_local": "14:00"
    }
  },
  "candidates": [
    {
      "time_local": "1997-12-18T11:23:00",
      "lagna_deg": 247.2,
      "pranapada_deg": 248.0,
      "delta_pp_deg": 0.8,
      "passes_trine_rule": true,
      "verification_scores": {
        "degree_match": 84.0,
        "gulika_alignment": 72.0,
        "moon_alignment": 68.0,
        "combined_verification": 84.0
      },
      "special_lagnas": {
        "bhava_lagna": 285.5,
        "hora_lagna": 312.3,
        "ghati_lagna": 298.7,
        "varnada_lagna": 45.0
      },
      "nisheka": {
        "nisheka_lagna_deg": 217.2,
        "gestation_months": 9.0,
        "is_realistic": true,
        "gestation_score": 100.0
      },
      "composite_score": 85.2,
      "physical_traits_scores": {
        "height": 100.0,
        "build": 80.0,
        "complexion": 90.0,
        "overall": 90.0
      },
      "life_events_scores": {
        "marriage": 85.0,
        "children": 75.0,
        "career": 80.0,
        "overall": 80.0
      }
    }
  ],
  "best_candidate": { ... }
}
```

## BPHS Methodology

**Important**: All methods are based strictly on BPHS Chapter 4 verses. No other texts or commentaries are used.

### 1. Gulika Calculation (BPHS 4.1-4.3)

- Divide day/night duration into 8 equal parts (khandas)
- Assign each khanda to planets starting from weekday lord
- Saturn's khanda = Gulika period
- Gulika Lagna = Ascendant at Gulika midpoint

### 2. Pranapada Calculation

**Method 1 - Madhya Pranapada (BPHS 4.5)**:
```
1. Multiply ghatis × 4
2. Divide palas ÷ 15
3. Add both
4. Divide by 12 → Rashi
5. Remainder × 2 → Degrees
```

**Method 2 - Sphuta Pranapada (BPHS 4.7)** - **Primary Method**:
```
1. Convert Ishta Kala to total palas
2. Divide by 15 → Rashi fraction
3. Add to Sun based on Sun's rashi nature:
   - Chara (Movable): Add to Sun
   - Sthira (Fixed): Add to 9th from Sun
   - Dvisvabhava (Dual): Add to 5th from Sun
```

### 3. Hard Filters

**Trine Rule (BPHS 4.10)** - **MANDATORY**:
- Birth Lagna must be in 1st, 5th, or 9th from Pranapada
- If not satisfied → Rejected (not human birth per BPHS)

**Degree Matching (BPHS 4.6)**:
- Lagna degrees ≈ Pranapada degrees
- Tolerance: ±2° (configurable)

**Triple Verification (BPHS 4.8)**:
- Must satisfy at least one:
  - Pranapada alignment
  - Gulika alignment
  - Moon alignment

### 4. Enhanced Scoring System

**Composite Score Calculation**:
- BPHS hard filters: 50% (degree_match: 20%, trine: 15%, verification: 15%)
- Physical traits: 20% (if provided)
- Life events: 20% (if provided)
- Nisheka: 10%

**Physical Traits Scoring (BPHS Chapter 2)**:
- Height: Based on lagna sign (Large/Medium/Small body types)
- Build: Based on lagnesh and planets in lagna (Athletic/Slim/Heavy)
- Complexion: Based on planets in lagna (Fair/Wheatish/Dark)

**Life Events Verification**:
- **Marriage**: Verified using D-9 (Navamsa) 7th house and Vimshottari dasha timing
- **Children**: Verified using D-7 (Saptamsa) 5th house and dasha timing
- **Career**: Verified using D-10 (Dasamsa) 10th house and dasha timing (BPHS 12.211)

**Vimshottari Dasha**:
- Calculates Mahadasha-Antardasha at event dates
- Verifies alignment with favorable planetary periods for each event type

**Divisional Charts**:
- D-3 (Drekkana): Siblings, courage
- D-7 (Saptamsa): Children
- D-9 (Navamsa): Marriage, spouse
- D-10 (Dasamsa): Career, profession
- D-12 (Dwadasamsa): Parents, family
- D-60 (Shashtiamsa): Detailed analysis

## Testing

Run all tests:
```bash
pytest tests/
```

Run specific test file:
```bash
pytest tests/test_btr_core.py
pytest tests/test_main.py
```

Run with verbose output:
```bash
pytest -v tests/
```

Run with coverage:
```bash
pytest --cov=backend tests/
```

## Example Usage

### Example 1: Unknown Birth Time (Full 24h Search)

```bash
curl -X POST http://localhost:8000/api/btr \
  -H "Content-Type: application/json" \
  -d '{
    "dob": "1990-05-15",
    "pob_text": "Mumbai, India",
    "tz_offset_hours": 5.5,
    "approx_tob": {
      "mode": "unknown"
    }
  }'
```

This will search the entire 24-hour period (00:00 to 23:59) for valid birth times.

### Example 2: Approximate Time Known

```bash
curl -X POST http://localhost:8000/api/btr \
  -H "Content-Type: application/json" \
  -d '{
    "dob": "1985-08-20",
    "pob_text": "London, UK",
    "tz_offset_hours": 0.0,
    "approx_tob": {
      "mode": "approx",
      "center": "14:30",
      "window_hours": 2.0
    }
  }'
```

This searches from 12:30 to 16:30 (2 hours before and after 14:30).

### Example 3: Explicit Time Range

```bash
curl -X POST http://localhost:8000/api/btr \
  -H "Content-Type: application/json" \
  -d '{
    "dob": "1992-03-10",
    "pob_text": "New York, USA",
    "tz_offset_hours": -5.0,
    "approx_tob": {
      "mode": "unknown"
    },
    "time_range_override": {
      "start": "08:00",
      "end": "12:00"
    }
  }'
```

This overrides the approximate time settings and searches only from 08:00 to 12:00.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions on free-tier hosting platforms (Render, Railway, etc.).

## Limitations & Notes

- This is a **prototype** for educational and research purposes
- Physical traits and life events scoring is fully implemented and used in composite scoring
- Step size for time search is configurable (default: 10 minutes in code, can be adjusted)
- Swiss Ephemeris data files are included with pyswisseph package; no separate download needed
- Free-tier hosting platforms may have timeout limits for long searches (full 24h with 2-minute steps)
- OpenCage API has free tier limits: 2,500 requests/day
- Frontend requires Node.js 18+ for development; production build can be served statically

## Troubleshooting

### Issue: "OPENCAGE_API_KEY is not configured"
**Solution**: Set the `OPENCAGE_API_KEY` environment variable or create a `.env` file with your API key.

### Issue: Tests fail with "swisseph not found"
**Solution**: Ensure pyswisseph is installed: `pip install pyswisseph`

### Issue: No candidates found
**Possible reasons**:
- Time range too narrow
- All candidates failed BPHS trine rule (BPHS 4.10) - not human birth per BPHS
- Step size too large (try smaller steps like 2-5 minutes)

### Issue: Build fails on deployment platform
**Solution**: 
- Ensure Python 3.10+ is specified
- Check that all dependencies in `requirements.txt` are compatible
- Some platforms may need: `pip install --upgrade pip setuptools wheel` before installing requirements

## BPHS Compliance

This implementation follows **strict BPHS-only compliance**:

- ✅ All formulas match exact BPHS verses from Chapter 4
- ✅ No non-BPHS rules or heuristics implemented
- ✅ All code functions include BPHS verse citations
- ✅ Frontend displays BPHS-based justifications
- ✅ Comprehensive test suite verifies BPHS compliance

**BPHS Verses Implemented**: 4.1-4.3, 4.5-4.8, 4.10-4.11, 4.12-4.16, 4.18-4.28

**Source Files**:
- Verse translations: `docs/BPHS-BTR-Exact-Verses.md`
- Implementation plan: `docs/BTR-Pipeline-Implementation-Plan.md`
- Workflow: `docs/BTR-ASCII-Workflow.md`

## References

- **Primary Source**: Brihat Parashara Hora Shastra (बृहत्पाराशरहोराशास्त्र) - Chapter 4: लग्नाध्याय
- **Verse Documentation**: See `docs/BPHS-BTR-Exact-Verses.md` for exact Sanskrit verses and translations
- **Implementation Plan**: See `docs/BTR-Pipeline-Implementation-Plan.md` for detailed pipeline
- **Workflow**: See `docs/BTR-ASCII-Workflow.md` for end-to-end process flow

## License

This project is for educational and research purposes.

---

**॥ श्री गणेशाय नमः ॥**  
**॥ ॐ तत्सत् ॥**
