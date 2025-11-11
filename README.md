

  ## Running the code

  Lightweight frontend app for practicing interview answers with real-time speech transcription and analysis.

  This repository contains a React + TypeScript single-page application (built with Vite). The app records your voice in the browser, transcribes it using the Web Speech API, analyzes the transcript locally (WPM, filler words, sentiment, clarity, etc.), and stores session history in localStorage.

  Original design: https://www.figma.com/design/OIzHb47st1kcPLE2ed4Agd/AI-Interview-Feedback-App

  ## Quickstart (local)

  1. Install dependencies

  ```powershell
  npm install
  ```

  2. Start the dev server

  ```powershell
  npm run dev
  ```

  Vite is configured to open the app on port 3000 by default (http://localhost:3000). If Vite chooses a different port, check your terminal output for the exact URL.

  ## Important notes

  - This is a frontend-only project — there is no backend server or API in this repo. All transcription and analysis run in the browser and sessions are saved to `localStorage`.
  - Speech recognition uses the Web Speech API (SpeechRecognition) and works best in Chrome or Edge. Firefox does not fully support the same SpeechRecognition API.

  ## Microphone troubleshooting

  If the microphone doesn't work, try the following:

  - Make sure you're using Chrome or Edge and the page is served over `http://localhost` or `https`.
  - Check the browser permission: click the lock icon in the address bar → Site settings → Microphone → Allow.
  - Check Windows privacy settings: Settings → Privacy & security → Microphone → Allow apps to access your microphone.
  - Ensure no other app (Zoom, Teams, etc.) is locking the microphone exclusively. Close other apps and retry.
  - In the browser console you can run this quick test to force the permission prompt and see detailed errors:

  ```javascript
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => { console.log('permission granted'); stream.getTracks().forEach(t => t.stop()); })
    .catch(err => console.error('getUserMedia failed:', err.name, err.message));
  ```

  I added a permission check to the recorder so the app will prompt for microphone access using `getUserMedia` before starting speech recognition and will show clearer error messages (permission denied, no device found, unsupported browser).

  ## Key files

  - `src/main.tsx` — app bootstrap
  - `src/App.tsx` — top-level state, session persistence (localStorage), routes/tabs
  - `src/components/AudioRecorder.tsx` — microphone flow, start/stop recording, speech recognition (I updated this file to call `getUserMedia` first)
  - `src/utils/speechAnalysis.ts` — transcript analysis logic (WPM, filler words, sentiment, clarity, confidence)
  - `src/components/AnalysisResults.tsx` & `src/components/FeedbackPanel.tsx` — UI for results and recommendations
  - `src/components/SessionHistory.tsx` — view/load/delete previous sessions

  ## Want a backend?

  If you want to persist sessions across devices, add user accounts, or use a server-side ML/LLM for richer analysis, I can scaffold a small Express or serverless backend and wire the frontend to it. Tell me which option you prefer and I will implement a minimal example.

  ## Contributing / Next steps

  - To test microphone behavior, open DevTools → Console and try recording. If you hit issues, paste the console error here (the `err.name` and `err.message`) and I'll help diagnose.
  - I can also add a visible "Check Microphone" button in the UI that runs `getUserMedia` and displays the raw error inline — say the word and I'll add it.

  Enjoy!
  ```
  