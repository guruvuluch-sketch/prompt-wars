import React from 'react';
import { AlertTriangle, Zap, CheckCircle2, FileText, Printer } from 'lucide-react';
import { motion } from 'motion/react';

interface AIResponse {
  intent: string;
  risk_assessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
  };
  recommended_actions: string[];
  helpful_resources: string[];
  confidence_score: number;
}

interface ResultsPanelProps {
  result: AIResponse;
  typewrittenReason: string;
  gpsCoords: string | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, typewrittenReason, gpsCoords }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'risk-low';
      case 'medium': return 'risk-medium';
      case 'high':
      case 'critical': return 'risk-high';
      default: return 'risk-low';
    }
  };

  const getGlowClass = (level: string) => {
    switch (level) {
      case 'low': return 'glow-low';
      case 'medium': return 'glow-medium';
      case 'high':
      case 'critical': return 'glow-high';
      default: return '';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
      aria-live="polite"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Intelligence Report</h2>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-white/10 rounded-lg hover:bg-blue-500/20 transition-all text-sm"
          aria-label="Print Report"
        >
          <Printer size={16} /> Export
        </button>
      </div>

      <div className="grid gap-4">
        <section className={`result-card ${getGlowClass(result.risk_assessment.level)}`} aria-labelledby="risk-header">
          <h3 id="risk-header" className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
            <AlertTriangle size={14} /> Risk Assessment
          </h3>
          <div className={`risk-badge ${getRiskColor(result.risk_assessment.level)} mb-3`}>
            {result.risk_assessment.level.toUpperCase()}
          </div>
          <p className="text-slate-100 leading-relaxed text-lg font-medium min-h-[3em]">
            {typewrittenReason}
            <span className="inline-block w-1 h-5 bg-blue-500 ml-1 animate-pulse" aria-hidden="true" />
          </p>
        </section>

        <section className="result-card" aria-labelledby="intent-header">
          <h3 id="intent-header" className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
            <Zap size={14} /> Primary Intent
          </h3>
          <p className="text-white font-semibold text-lg leading-snug">
            {result.intent}
          </p>
        </section>

        <section className="result-card" aria-labelledby="actions-header">
          <h3 id="actions-header" className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
            <CheckCircle2 size={14} /> Recommended Action Protocol
          </h3>
          <ul className="action-list">
            {result.recommended_actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </section>

        <section className="result-card" aria-labelledby="resources-header">
          <h3 id="resources-header" className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
            <FileText size={14} /> Context & Resources
          </h3>
          <div className="text-slate-400 text-sm space-y-2">
            {result.helpful_resources.map((res, i) => (
              <p key={i}>• {res}</p>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-500">
            <span>AI Confidence: <strong className="text-blue-500">{result.confidence_score}%</strong></span>
            <span>{gpsCoords ? `📍 ${gpsCoords}` : 'No GPS Data'}</span>
          </div>
        </section>
      </div>
    </motion.div>
  );
};
