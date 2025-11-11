import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { analyzeTranscript } from '../utils/speechAnalysis';
import { AnalysisData } from '../App';

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
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
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
      // We only needed to prompt for permission here; stop tracks immediately.
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch (e) {
        // ignore
      }

      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start recognition
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error('Failed to start recording:', e);
        setError('Failed to start speech recognition. Please try again.');
        setIsRecording(false);
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

  const stopRecording = () => {
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    recognitionRef.current?.stop();

    // Process the transcript
    if (transcript.trim()) {
      setIsProcessing(true);
      
      // Simulate processing time for better UX
      setTimeout(() => {
        const duration = recordingTime;
        const analysis = analyzeTranscript(transcript, duration);
        onAnalysisComplete(analysis);
        setIsProcessing(false);
      }, 500);
    } else {
      setError('No speech was detected. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording Button */}
      <div className="flex flex-col items-center gap-4">
        {!isRecording && !isProcessing && (
          <Button
            onClick={startRecording}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={!!error && error.includes('not supported')}
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <div className="w-full space-y-4">
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-700">Recording...</span>
              </div>
              <div className="text-2xl text-red-700">{formatTime(recordingTime)}</div>
            </div>
            
            <Button
              onClick={stopRecording}
              variant="outline"
              size="lg"
              className="w-full border-red-500 text-red-700 hover:bg-red-50"
            >
              <Square className="w-5 h-5 mr-2 fill-current" />
              Stop & Analyze
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-blue-700">Analyzing your speech...</p>
          </div>
        )}
      </div>

      {/* Live Transcript Preview */}
      {isRecording && transcript && (
        <div className="bg-gray-50 rounded-xl p-4 max-h-40 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-2">Live Transcript:</p>
          <p className="text-sm text-gray-700">{transcript}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Browser Support Notice */}
      {!error && (
        <p className="text-xs text-gray-500 text-center">
          Works best in Chrome or Edge browser
        </p>
      )}
    </div>
  );
}