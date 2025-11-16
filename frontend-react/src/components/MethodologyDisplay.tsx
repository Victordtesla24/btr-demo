import './MethodologyDisplay.css';

export function MethodologyDisplay() {
  return (
    <div className="methodology-display">
      <h2>BPHS Birth Time Rectification Methodology</h2>
      <div className="methodology-content">
        <div className="methodology-section">
          <h3>Source</h3>
          <p>
            <strong>Brihat Parashara Hora Shastra (बृहत्पाराशरहोराशास्त्र)</strong> - Chapter 4: लग्नाध्याय (Lagna Adhyaya)
          </p>
          <p className="note">
            All rectification methods are based strictly on the verses from this chapter. 
            No other texts, commentaries, or invented rules are used.
          </p>
        </div>

        <div className="methodology-section">
          <h3>Core Methods Implemented</h3>
          <div className="verse-list">
            <div className="verse-item">
              <h4>1. Gulika Calculation (BPHS 4.1-4.3)</h4>
              <p className="sanskrit">रविवारादिशन्यन्तं गुलिकादि निरूप्यते। दिवसानष्टधा कृत्वा वारेशाद्मणयेत््रमात्।</p>
              <p>
                Divide day/night duration into 8 equal parts (khandas). Count from weekday lord. 
                Saturn's khanda = Gulika period. Gulika Lagna is used for verification.
              </p>
            </div>

            <div className="verse-item">
              <h4>2. Pranapada Calculation (BPHS 4.5, 4.7)</h4>
              <p className="sanskrit">घटी चतुर्गुणा कार्यां तिथ्याप्तैश्च पलैर्युताः। दिनकरेणापहतं शेषं प्राणपदं स्मृतम्।</p>
              <p>
                <strong>Method A (Madhya - Rough):</strong> Multiply ghatis × 4, add palas ÷ 15, divide by 12.
                <br />
                <strong>Method B (Sphuta - Accurate):</strong> Convert to palas, divide by 15, add to Sun based on 
                Sun's rashi nature (Chara/Sthira/Dvisvabhava). This is the primary method used.
              </p>
            </div>

            <div className="verse-item">
              <h4>3. Trine Rule - MANDATORY (BPHS 4.10) ⭐</h4>
              <p className="sanskrit">प्राणपदं को राशि से त्रिकोण राशि मे मनुष्यों के जन्मलग्न की राशि होती है।</p>
              <p>
                <strong>CRITICAL:</strong> Birth lagna must be in trine position (1st, 5th, or 9th) from Pranapada's rashi. 
                If this fails, the candidate is rejected as non-human birth per BPHS.
              </p>
            </div>

            <div className="verse-item">
              <h4>4. Degree Matching (BPHS 4.6)</h4>
              <p className="sanskrit">लग्नांशप्राणांशपदैक्यता स्यात्</p>
              <p>
                Lagna degrees and Pranapada degrees should be equal (पदैक्यता). 
                Tolerance: ±2° for acceptable match.
              </p>
            </div>

            <div className="verse-item">
              <h4>5. Triple Verification (BPHS 4.8)</h4>
              <p className="sanskrit">विना प्राणपदाच्छुद्धो गुलिकाद्वा निशाकराद्</p>
              <p>
                Birth lagna must be verified by at least one of: Pranapada, Gulika, or Moon. 
                If none align, the lagna is considered impure (Ashuddha).
              </p>
            </div>

            <div className="verse-item">
              <h4>6. Special Lagnas (BPHS 4.18-28)</h4>
              <ul>
                <li><strong>Bhava Lagna (4.18):</strong> Every 5 ghatis = 1 sign progression</li>
                <li><strong>Hora Lagna (4.20-21):</strong> Every 2.5 ghatis = 1 sign progression</li>
                <li><strong>Ghati Lagna (4.22-24):</strong> 1 ghati = 1 sign, 1 pala = 2 degrees</li>
                <li><strong>Varnada Lagna (4.26-28):</strong> Calculated from Janma + Hora lagnas</li>
              </ul>
            </div>

            <div className="verse-item">
              <h4>7. Nisheka Lagna (BPHS 4.12-16)</h4>
              <p className="sanskrit">यस्मिन् भावे स्थितो कोणस्तस्य मान्देर्यदन्तरम्। लग्नभाग्यन्तरं योज्यं यच्च राश्यादि जायते।</p>
              <p>
                Calculates conception time and verifies gestation period. Should be approximately 9 lunar months 
                (5-10.5 months) for realistic human birth.
              </p>
            </div>
          </div>
        </div>

        <div className="methodology-section">
          <h3>Rectification Pipeline</h3>
          <ol className="pipeline-steps">
            <li><strong>Phase 1:</strong> Calculate sunrise/sunset and generate candidate times</li>
            <li><strong>Phase 2:</strong> Calculate Gulika Lagna (BPHS 4.1-4.3)</li>
            <li><strong>Phase 3:</strong> Calculate Pranapada - both Madhya and Sphuta (BPHS 4.5, 4.7)</li>
            <li><strong>Phase 4:</strong> Apply hard filters:
              <ul>
                <li>Trine Rule (BPHS 4.10) - MANDATORY</li>
                <li>Degree Matching (BPHS 4.6)</li>
                <li>Triple Verification (BPHS 4.8)</li>
              </ul>
            </li>
            <li><strong>Phase 5:</strong> Calculate Special Lagnas (BPHS 4.18-28)</li>
            <li><strong>Phase 6:</strong> Calculate Nisheka Lagna (BPHS 4.12-16)</li>
            <li><strong>Phase 7:</strong> Optional: Score physical traits and life events</li>
            <li><strong>Phase 8:</strong> Rank candidates by composite score</li>
          </ol>
        </div>

        <div className="methodology-section">
          <h3>Important Notes</h3>
          <ul className="notes-list">
            <li>All calculations use <strong>sidereal zodiac</strong> with <strong>Lahiri ayanamsa</strong></li>
            <li>High-precision Swiss Ephemeris (JPL-based) is used for astronomical calculations</li>
            <li>Only BPHS verses from Chapter 4 are implemented - no other texts or commentaries</li>
            <li>The Trine Rule (BPHS 4.10) is <strong>mandatory</strong> - candidates failing this are rejected</li>
            <li>Sphuta Pranapada (BPHS 4.7) is the primary rectification method used</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

