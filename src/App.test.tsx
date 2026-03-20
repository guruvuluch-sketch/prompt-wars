import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import React from 'react';

// Mocking external libraries
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      get: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            intent: "Test Intent",
            risk_assessment: { level: "low", reason: "Test Reason" },
            recommended_actions: ["Action 1"],
            helpful_resources: ["Resource 1"],
            confidence_score: 95
          })
        })
      })
    }
  })),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
    NUMBER: 'NUMBER'
  }
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Map: () => <div data-testid="google-map">Map</div>,
  AdvancedMarker: () => <div>Marker</div>,
  Pin: () => <div>Pin</div>
}));

describe('IntentBridge AI App', () => {
  it('renders the main title', () => {
    render(<App />);
    expect(screen.getByText(/IntentBridge/i)).toBeDefined();
  });

  it('switches tabs correctly', () => {
    render(<App />);
    const voiceTab = screen.getByRole('tab', { name: /Voice/i });
    fireEvent.click(voiceTab);
    expect(screen.getByText(/Click the microphone to start speaking/i)).toBeDefined();
  });

  it('shows settings modal when settings button is clicked', () => {
    render(<App />);
    const settingsBtn = screen.getByLabelText(/Open Settings/i);
    fireEvent.click(settingsBtn);
    expect(screen.getByText(/System Authentication/i)).toBeDefined();
  });

  it('displays empty state initially', () => {
    render(<App />);
    expect(screen.getByText(/System Ready/i)).toBeDefined();
  });
});
