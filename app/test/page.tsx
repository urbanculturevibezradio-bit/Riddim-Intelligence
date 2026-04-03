'use client';
import { useState } from 'react';

export default function TestPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/riddim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer || data.error);
    } catch (e) {
      setAnswer('Error connecting to API');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#00ff88' }}>🎵 Riddim Intelligence — Test</h1>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask about a riddim..."
        rows={4}
        style={{ width: '100%', padding: '12px', fontSize: '16px', marginBottom: '12px' }}
      />
      <br />
      <button
        onClick={ask}
        disabled={loading}
        style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#00ff88', border: 'none', cursor: 'pointer' }}
      >
        {loading ? 'Thinking...' : 'Ask Riddim Intelligence'}
      </button>
      {answer && (
        <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#111', color: '#fff', borderRadius: '8px' }}>
          <strong>Answer:</strong>
          <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{answer}</p>
        </div>
      )}
    </div>
  );
}