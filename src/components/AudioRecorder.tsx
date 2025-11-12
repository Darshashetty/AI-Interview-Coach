import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { analyzeTranscript } from '../utils/speechAnalysis';
import { saveBlob } from '../utils/indexedDB';
import { AnalysisData } from '../App';
import { motion } from 'framer-motion';
const MButton: any = motion.button;

interface AudioRecorderProps {
  onAnalysisComplete: (data: AnalysisData) => void;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
}

export function AudioRecorder({ onAnalysisComplete, isRecording, setIsRecording }: AudioRecorderProps) {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      // don't block recording if speech recognition isn't available; only warn
      setError('Speech recognition is not supported in your browser. Live transcript will be unavailable.');
      // continue without recognition
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let newFinalTranscript = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      finalTranscriptRef.current = newFinalTranscript;
      setTranscript(newFinalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable microphone permissions.');
      } else {
        setError('An error occurred. Please try again.');
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecording) {
        // Restart if it stops unexpectedly
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording, setIsRecording]);

  const startRecording = async () => {
    setError(null);
    setTranscript('');
    setRecordingTime(0);
    finalTranscriptRef.current = '';

    // Request microphone permission using getUserMedia so the browser shows a prompt
    // and we can give clearer error messages if access is denied or no device is present.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone access is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup MediaRecorder to capture audio for Whisper upload
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/webm;codecs=opus';
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
      } catch (e) {
        console.warn('MediaRecorder setup failed', e);
      }

      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start media recorder if available
      try {
        mediaRecorderRef.current?.start();
      } catch (e) {
        // ignore
      }

      // Start recognition
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    } catch (err: any) {
      console.error('getUserMedia error', err);
      // Normalize common errors into friendly messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please enable microphone permissions for this site.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError('Unable to access microphone: ' + (err.message || err.name));
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    recognitionRef.current?.stop();

    // Stop MediaRecorder and build blob
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      // ignore
    }

    const chunks = audioChunksRef.current;
    if (chunks && chunks.length > 0) {
      setIsProcessing(true);
      const blob = new Blob(chunks, { type: chunks[0].type || 'audio/webm' });

      let base64: string | null = null;
      let mime: string | null = null;
      try {
        // Convert blob to base64 and capture MIME type
        const toBase64 = (b: Blob) => new Promise<{ base: string; mime: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const m = dataUrl.match(/^data:(.*);base64,(.*)$/);
            if (m) {
              resolve({ base: m[2], mime: m[1] });
            } else {
              reject(new Error('Failed to parse data URL'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(b);
        });

        const res = await toBase64(blob);
        base64 = res.base;
        mime = res.mime;

        // Also store the raw Blob in IndexedDB keyed by timestamp so playback can read the blob directly
        let savedBlobKey: string | null = null;
        try {
          const key = `session-audio-${Date.now()}`;
          await saveBlob(key, blob);
          savedBlobKey = key;
        } catch (dbErr) {
          // ignore DB errors; continue attaching base64/mime
          // eslint-disable-next-line no-console
          console.warn('IndexedDB save failed', dbErr);
        }

        // small helper to attach audioBase64 and mime before calling back
        // Define a single processAnalysis closure that attaches base64, mime and the saved blob key (if any)
        const processAnalysis = (analysisObj: any) => {
          try { analysisObj.audioBase64 = base64; } catch (e) {}
          try { analysisObj.audioMime = mime; } catch (e) {}
          try { analysisObj.audioBlobKey = savedBlobKey; } catch (e) { analysisObj.audioBlobKey = null; }
          onAnalysisComplete(analysisObj);
        };

        const resp = await fetch('/api/whisper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: base64, filename: 'recording.webm' }) });
        if (resp.ok) {
          const data = await resp.json();
          const serverTranscript = data.transcript;
          const final = serverTranscript && serverTranscript.trim() ? serverTranscript : finalTranscriptRef.current || transcript;
          const duration = recordingTime;

          // Try server-side analysis first, fallback to client analysis
          try {
            const aResp = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: final, duration }) });
            if (aResp.ok) {
              const analysisData = await aResp.json();
              processAnalysis(analysisData);
            } else {
              const analysis = analyzeTranscript(final, duration) as any;
              processAnalysis(analysis);
            }
          } catch (e) {
            console.warn('analysis API failed, falling back to client analysis', e);
            const analysis = analyzeTranscript(final, duration) as any;
            processAnalysis(analysis);
          }
        } else {
          console.warn('whisper upload failed', resp.status);
          const final = finalTranscriptRef.current || transcript;
          if (final.trim()) {
            const duration = recordingTime;
            try {
              const aResp = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: final, duration }) });
              if (aResp.ok) {
                const analysisData = await aResp.json();
                processAnalysis(analysisData);
              } else {
                const analysis = analyzeTranscript(final, duration) as any;
                processAnalysis(analysis);
              }
            } catch (e) {
              const analysis = analyzeTranscript(final, duration) as any;
              processAnalysis(analysis);
            }
          } else {
            setError('No speech was detected. Please try again.');
          }
        }
      } catch (err) {
        console.error('Upload/processing error', err);
        const final = finalTranscriptRef.current || transcript;
        if (final.trim()) {
          const duration = recordingTime;
          try {
            const aResp = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: final, duration }) });
            if (aResp.ok) {
              const analysisData = await aResp.json();
                  // best-effort attach base64 and mime if available
                  try { (analysisData as any).audioBase64 = base64; } catch (e) {}
                  try { (analysisData as any).audioMime = mime; } catch (e) {}
                  onAnalysisComplete(analysisData);
            } else {
              const analysis = analyzeTranscript(final, duration) as any;
                  try { analysis.audioBase64 = base64; } catch (e) {}
                  try { analysis.audioMime = mime; } catch (e) {}
                  onAnalysisComplete(analysis);
            }
          } catch (e) {
            const analysis = analyzeTranscript(final, duration) as any;
                try { analysis.audioBase64 = base64; } catch (e) {}
                try { analysis.audioMime = mime; } catch (e) {}
                onAnalysisComplete(analysis);
          }
        } else {
          setError('No speech was detected. Please try again.');
        }
      } finally {
        setIsProcessing(false);
        // stop and cleanup stream
        try {
          streamRef.current?.getTracks().forEach(t => t.stop());
        } catch (e) {}
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        streamRef.current = null;
      }
    } else {
      // No recorded audio chunks — fallback to transcript
      if (transcript.trim()) {
        setIsProcessing(true);
        setTimeout(() => {
          const duration = recordingTime;
          const analysis = analyzeTranscript(transcript, duration);
          onAnalysisComplete(analysis);
          setIsProcessing(false);
        }, 500);
      } else {
        setError('No speech was detected. Please try again.');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 dark:text-white">
      {/* Mobile full-screen overlay while recording (small screens) */}
      {isRecording && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-semibold">Recording</span>
              </div>
              <button onClick={stopRecording} className="px-3 py-1 bg-white text-slate-900 rounded border border-gray-200">Stop</button>
            </div>

            <div className="rounded-xl bg-slate-800 p-4 mb-4">
              <div className="text-3xl font-bold text-center">{formatTime(recordingTime)}</div>
              {transcript && <p className="text-sm mt-3 text-slate-200 max-h-40 overflow-auto whitespace-pre-wrap">{transcript}</p>}
            </div>

            <div className="w-full">
              <button onClick={stopRecording} className="w-full py-3 rounded-lg bg-white text-slate-900 font-semibold">Stop & Analyze</button>
            </div>
          </div>
        </div>
      )}
      {/* Recording Button */}
      <div className="flex flex-col items-center gap-4">
        {!isRecording && !isProcessing && (
            <Button
                  onClick={startRecording}
                  size="lg"
                  className="w-full bg-white text-gray-900 font-semibold border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  disabled={!!error && /microphone|access denied|permission denied|not allowed/i.test(error)}
                >
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          )}

        {isRecording && (
          <div className="w-full space-y-4">
            <div className="bg-red-50 dark:bg-red-900 border-2 border-red-500 dark:border-red-700 rounded-xl p-6 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-700 dark:text-red-200">Recording...</span>
              </div>
              <div className="text-2xl text-red-700 dark:text-red-200">{formatTime(recordingTime)}</div>
            </div>

            <Button
              onClick={stopRecording}
              variant="outline"
              size="lg"
              className="w-full bg-white text-gray-900 font-semibold border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-white dark:border-slate-700"
            >
              <Square className="w-5 h-5 mr-2 fill-current" />
              Stop & Analyze
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="w-full bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-200 animate-spin mx-auto mb-2" />
            <p className="text-blue-700 dark:text-blue-200">Analyzing your speech...</p>
          </div>
        )}
      </div>

      {/* Live Transcript Preview */}
      {isRecording && transcript && (
  <div className="bg-gray-50 dark:bg-slate-900 dark:text-white rounded-xl p-4 max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Live Transcript:</p>
          <p className="text-sm text-gray-700 dark:text-gray-100">{transcript}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Browser Support Notice */}
      {!error && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Works best in Chrome or Edge browser
        </p>
      )}

      {/* Mobile fixed controls removed to avoid duplicate Start/Stop buttons */}
    </div>
  );
}