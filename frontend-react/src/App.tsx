import { useState } from 'react';
import type { BTRRequest, BTRResponse } from './types';
import { MultiStepForm } from './components/MultiStepForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { calculateBTR } from './services/api';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BTRResponse | null>(null);

  const handleSubmit = async (request: BTRRequest) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await calculateBTR(request);
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Birth Time Rectification (BPHS Prototype)</h1>
        <p className="subtitle">Based on Brihat Parashara Hora Shastra - Chapter 4 (लग्नाध्याय)</p>
      </header>
      
      {!results && !loading && <MultiStepForm onSubmit={handleSubmit} />}
      
      {loading && <LoadingSpinner />}
      {error && (
        <>
          <ErrorDisplay message={`Error: ${error}`} />
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              onClick={() => {
                setError(null);
                setResults(null);
              }}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </>
      )}
      {results && (
        <ResultsDisplay 
          data={results} 
          onNewCalculation={() => {
            setResults(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
