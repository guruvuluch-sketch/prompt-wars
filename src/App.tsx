/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Settings, 
  Mic, 
  Image as ImageIcon, 
  FileText, 
  Upload, 
  MapPin, 
  Zap, 
  Shield, 
  Printer, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for AI Response
interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

interface AIResponse {
  intent: string;
  risk_assessment: RiskAssessment;
  recommended_actions: string[];
  helpful_resources: string[];
  confidence_score: number;
}

export default function App() {
  // State
  const [apiKey, setApiKey] = useState<string>(process.env.GEMINI_API_KEY || '');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'voice' | 'image'>('text');
  
  // Inputs
  const [textInput, setTextInput] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [includeGps, setIncludeGps] = useState(true);
  const [gpsCoords, setGpsCoords] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState('');

  // Results
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [typewrittenReason, setTypewrittenReason] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);

  // Initialize GPS
  useEffect(() => {
    if (includeGps && navigator.geolocation) {
      setGpsStatus('Acquiring GPS...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          setGpsCoords(coords);
          setGpsStatus(`GPS Locked: ${coords}`);
        },
        () => {
          setGpsStatus('GPS Failed');
        }
      );
    } else {
      setGpsCoords(null);
      setGpsStatus('');
    }
  }, [includeGps]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  // Typewriter effect for reason
  useEffect(() => {
    if (result?.risk_assessment.reason) {
      let i = 0;
      const reason = result.risk_assessment.reason;
      setTypewrittenReason('');
      const interval = setInterval(() => {
        setTypewrittenReason((prev) => prev + reason.charAt(i));
        i++;
        if (i >= reason.length) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }
  }, [result]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setVoiceTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyzeThreat = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.models.get({ model: "gemini-3-flash-preview" });

      const parts: any[] = [];
      
      // System Prompt
      parts.push({ text: `You are an emergency Multimodal AI. Analyze the following telemetry and output RAW JSON strictly matching this schema:
      {
        "intent": "string (primary intent of the user or situation)",
        "risk_assessment": {
          "level": "low" | "medium" | "high" | "critical",
          "reason": "string (detailed explanation)"
        },
        "recommended_actions": ["string", ...],
        "helpful_resources": ["string", ...],
        "confidence_score": number (0-100)
      }` });

      // User Input
      if (activeTab === 'text' && textInput) {
        parts.push({ text: `User Report: ${textInput}` });
      } else if (activeTab === 'voice' && voiceTranscript) {
        parts.push({ text: `Voice Transcript: ${voiceTranscript}` });
      } else if (activeTab === 'image' && imagePreview) {
        const base64Data = imagePreview.split(',')[1];
        const mimeType = imageFile?.type || 'image/jpeg';
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
        parts.push({ text: "Emergency photo provided for analysis." });
      }

      if (gpsCoords) {
        parts.push({ text: `INCIDENT LOCATION COORDS: ${gpsCoords}` });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              risk_assessment: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
                  reason: { type: Type.STRING }
                },
                required: ['level', 'reason']
              },
              recommended_actions: { type: Type.ARRAY, items: { type: Type.STRING } },
              helpful_resources: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence_score: { type: Type.NUMBER }
            },
            required: ['intent', 'risk_assessment', 'recommended_actions', 'helpful_resources', 'confidence_score']
          }
        }
      });

      const data = JSON.parse(response.text);
      setResult(data);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please check your API key and network connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Panel: Inputs */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel"
        >
          <header className="flex justify-between items-center mb-8 pb-5 border-b border-white/10">
            <h1 className="text-3xl font-extrabold tracking-tight">
              IntentBridge <span className="text-blue-500 shadow-blue-500/50">AI</span>
            </h1>
            <button 
              onClick={() => setShowSettings(true)}
              className="icon-btn"
            >
              <Settings size={20} />
            </button>
          </header>

          <div className="flex gap-3 mb-6">
            <button 
              onClick={() => setActiveTab('text')}
              className={`tab-btn flex items-center justify-center gap-2 ${activeTab === 'text' ? 'active' : ''}`}
            >
              <FileText size={18} /> Text
            </button>
            <button 
              onClick={() => setActiveTab('voice')}
              className={`tab-btn flex items-center justify-center gap-2 ${activeTab === 'voice' ? 'active' : ''}`}
            >
              <Mic size={18} /> Voice
            </button>
            <button 
              onClick={() => setActiveTab('image')}
              className={`tab-btn flex items-center justify-center gap-2 ${activeTab === 'image' ? 'active' : ''}`}
            >
              <ImageIcon size={18} /> Image
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'text' && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <textarea 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Describe the situation in detail. For example: 'A tree has fallen on power lines on Main St, sparks are flying.'"
                />
              </motion.div>
            )}

            {activeTab === 'voice' && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 bg-black/40 rounded-2xl border border-white/10 text-center"
              >
                <button 
                  onClick={toggleRecording}
                  className={`icon-btn w-20 h-20 text-2xl mx-auto mb-5 ${isRecording ? 'text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : ''}`}
                >
                  <Mic size={32} />
                </button>
                <p className="text-slate-400 font-medium">
                  {isRecording ? 'Recording (Listening)...' : voiceTranscript || 'Click the microphone to start speaking'}
                </p>
              </motion.div>
            )}

            {activeTab === 'image' && (
              <motion.div
                key="image"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-blue-500/50 rounded-2xl cursor-pointer bg-black/20 hover:bg-black/30 transition-all">
                  <Upload size={40} className="mb-3 text-blue-500" />
                  <span className="text-slate-400 font-semibold">
                    {imageFile ? imageFile.name : 'Upload Emergency Photo'}
                  </span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                {imagePreview && (
                  <img src={imagePreview} className="w-full max-h-60 object-cover rounded-xl mt-4 border border-white/10" alt="Preview" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 flex items-center gap-3 mb-6">
            <input 
              type="checkbox" 
              id="gpsToggle" 
              checked={includeGps}
              onChange={(e) => setIncludeGps(e.target.checked)}
              className="w-5 h-5 accent-blue-500 cursor-pointer"
            />
            <label htmlFor="gpsToggle" className="text-slate-400 text-sm cursor-pointer flex items-center gap-1">
              <MapPin size={14} /> Include GPS Coordinates
            </label>
            <span className={`text-xs ml-auto ${gpsStatus.includes('Failed') ? 'text-red-500' : 'text-emerald-500'}`}>
              {gpsStatus}
            </span>
          </div>

          <button 
            onClick={analyzeThreat}
            disabled={isAnalyzing}
            className="primary-btn flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
            Analyze Threat Level
          </button>
        </motion.div>

        {/* Right Panel: Results */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel min-h-[500px] flex flex-col"
        >
          {!isAnalyzing && !result && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <Shield size={80} className="text-white/10 mb-6" />
              <h2 className="text-2xl font-bold text-white/50">System Ready</h2>
              <p className="mt-3 max-w-xs text-slate-500 leading-relaxed">
                Enter intelligence data on the left to extract structured intent, risk assessment, and recommended protocols.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="radar mb-6"></div>
              <h3 className="text-blue-500 uppercase tracking-widest text-sm font-bold animate-pulse">
                Analyzing Telemetry...
              </h3>
            </div>
          )}

          {result && !isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Intelligence Report</h2>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-white/10 rounded-lg hover:bg-blue-500/20 transition-all text-sm"
                >
                  <Printer size={16} /> Export
                </button>
              </div>

              <div className="grid gap-4">
                <div className={`result-card ${getGlowClass(result.risk_assessment.level)}`}>
                  <h3 className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
                    <AlertTriangle size={14} /> Risk Assessment
                  </h3>
                  <div className={`risk-badge ${getRiskColor(result.risk_assessment.level)} mb-3`}>
                    {result.risk_assessment.level.toUpperCase()}
                  </div>
                  <p className="text-slate-100 leading-relaxed text-lg font-medium min-h-[3em]">
                    {typewrittenReason}
                    <span className="inline-block w-1 h-5 bg-blue-500 ml-1 animate-pulse" />
                  </p>
                </div>

                <div className="result-card">
                  <h3 className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
                    <Zap size={14} /> Primary Intent
                  </h3>
                  <p className="text-white font-semibold text-lg leading-snug">
                    {result.intent}
                  </p>
                </div>

                <div className="result-card">
                  <h3 className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
                    <CheckCircle2 size={14} /> Recommended Action Protocol
                  </h3>
                  <ul className="action-list">
                    {result.recommended_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-card">
                  <h3 className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest mb-3">
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
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">System Authentication</h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-6">
                Enter your Gemini API Key to access emergency classification neural networks.
              </p>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-lg mb-8 outline-none focus:border-blue-500 transition-all"
              />
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 bg-transparent border border-white/20 rounded-xl font-semibold hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('intentbridge_apikey', apiKey);
                    setShowSettings(false);
                  }}
                  className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  Initialize Matrix
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
