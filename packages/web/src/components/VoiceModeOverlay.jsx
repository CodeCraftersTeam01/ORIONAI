import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Volume2, VolumeX, Sparkles } from 'lucide-react';

export default function VoiceModeOverlay({
  onClose,
  onSendPrompt,
  isGenerating = false,
  lastAiResponse = '',
  theme = 'dark',
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState('Mendengarkan Anda...');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakingAi, setIsSpeakingAi] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);
  const silenceTimerRef = useRef(null);
  const transcriptBufferRef = useRef('');

  // Stop speech synthesis helper
  const stopSpeaking = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    setIsSpeakingAi(false);
  }, []);

  // Speak AI response aloud
  const speakText = useCallback((text) => {
    if (!synthRef.current || !text) return;
    stopSpeaking();

    // Clean markdown symbols for cleaner TTS
    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, 'blok kode')
      .replace(/[*_#`~>\[\]()]/g, '')
      .trim();

    if (!cleanSpeech) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select natural Indonesian voice if available
      const voices = synthRef.current.getVoices?.() || [];
      const idVoice = voices.find((v) => v.lang.startsWith('id') || v.name.toLowerCase().includes('indonesia'));
      if (idVoice) utterance.voice = idVoice;

      utterance.onstart = () => {
        setIsSpeakingAi(true);
        setStatusText('Orion berbicara...');
      };

      utterance.onend = () => {
        setIsSpeakingAi(false);
        setStatusText('Mendengarkan Anda...');
        // Resume listening after speaking finishes
        if (!isMuted && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      utterance.onerror = () => {
        setIsSpeakingAi(false);
        setStatusText('Mendengarkan Anda...');
      };

      synthRef.current.speak(utterance);
    } catch {
      setIsSpeakingAi(false);
    }
  }, [stopSpeaking, isMuted]);

  // When AI finishes generating a response in voice mode, speak it
  useEffect(() => {
    if (!isGenerating && lastAiResponse) {
      speakText(lastAiResponse);
    } else if (isGenerating) {
      setStatusText('Orion sedang berpikir...');
    }
  }, [isGenerating, lastAiResponse, speakText]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusText('Browser Anda belum mendukung Web Speech Recognition.');
      return;
    }

    try {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'id-ID';

      recognizer.onstart = () => {
        setIsListening(true);
        if (!isSpeakingAi && !isGenerating) {
          setStatusText('Mendengarkan Anda...');
        }
      };

      recognizer.onresult = (event) => {
        // If Orion is currently speaking, stop TTS when user talks
        if (synthRef.current && synthRef.current.speaking) {
          stopSpeaking();
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentSpoken = (final || interim).trim();
        if (currentSpoken) {
          setTranscript(currentSpoken);
          transcriptBufferRef.current = currentSpoken;
          setStatusText('Mendengarkan Anda...');

          // Reset silence timer: when user pauses for 1.4s, send prompt
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const promptToSend = transcriptBufferRef.current.trim();
            if (promptToSend && !isGenerating) {
              setStatusText('Mengirim ke Orion...');
              if (typeof onSendPrompt === 'function') {
                onSendPrompt(promptToSend);
              }
              setTranscript('');
              transcriptBufferRef.current = '';
            }
          }, 1400);
        }
      };

      recognizer.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.warn('Speech recognition error:', e.error);
        }
      };

      recognizer.onend = () => {
        setIsListening(false);
        // Auto-restart listening if not muted and voice mode is still open
        if (!isMuted && !isSpeakingAi) {
          try {
            recognizer.start();
          } catch {}
        }
      };

      recognitionRef.current = recognizer;
      if (!isMuted) {
        recognizer.start();
      }
    } catch (err) {
      console.warn('Failed to start speech recognizer:', err);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      stopSpeaking();
    };
  }, [onSendPrompt, isGenerating, isMuted, isSpeakingAi, stopSpeaking]);

  // Handle keyboard Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopSpeaking();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, stopSpeaking]);

  // Toggle mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      try {
        recognitionRef.current?.start();
      } catch {}
    } else {
      setIsMuted(true);
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      setStatusText('Mikrofon dimatikan (Muted)');
    }
  };

  return (
    <div className="voice-mode-overlay animate-fade-in" role="dialog" aria-label="Mode Suara Orion AI">
      {/* Main Center Content: Equalizer Orb & Speech Feedback */}
      <div className="voice-mode-center-content">
        {/* Pulsating Voice Equalizer Orb */}
        <div
          className={`voice-equalizer-orb ${
            isSpeakingAi ? 'is-speaking' : isListening && transcript ? 'is-hearing' : 'is-idle'
          }`}
          onClick={toggleMute}
          title={isMuted ? 'Klik untuk aktifkan mikrofon' : 'Klik untuk matikan mikrofon'}
        >
          <div className="orb-glow-layer layer-1" />
          <div className="orb-glow-layer layer-2" />
          <div className="orb-glow-layer layer-3" />

          {/* Dynamic Soundwave Bars */}
          <div className="orb-equalizer-bars" aria-hidden="true">
            <span className="orb-bar bar-1" />
            <span className="orb-bar bar-2" />
            <span className="orb-bar bar-3" />
            <span className="orb-bar bar-4" />
            <span className="orb-bar bar-5" />
          </div>
        </div>

        {/* Live Status and Spoken Transcript */}
        <div className="voice-feedback-panel">
          <p className="voice-status-title">{statusText}</p>
          {transcript && (
            <p className="voice-transcript-text animate-fade-in">
              "{transcript}"
            </p>
          )}
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="voice-mode-bottom-bar">
        <button
          type="button"
          className={`voice-control-btn ${isMuted ? 'muted' : 'active'}`}
          onClick={toggleMute}
          title={isMuted ? 'Aktifkan Mikrofon' : 'Bungkam Mikrofon'}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          <span>{isMuted ? 'Mikrofon Mati' : 'Mikrofon Aktif'}</span>
        </button>

        <button
          type="button"
          className="voice-control-btn"
          onClick={() => {
            if (isSpeakingAi) stopSpeaking();
          }}
          disabled={!isSpeakingAi}
          title="Hentikan audio bicara"
        >
          {isSpeakingAi ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span>{isSpeakingAi ? 'Hentikan Suara' : 'Audio Suara'}</span>
        </button>
      </div>
    </div>
  );
}
