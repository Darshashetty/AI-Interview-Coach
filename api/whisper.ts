import type { VercelRequest, VercelResponse } from '@vercel/node'
import fetch from 'node-fetch'
import FormData from 'form-data'

// Accepts JSON { audio: '<base64>', filename: 'recording.webm' }
// Forwards to OpenAI Whisper transcription endpoint when OPENAI_API_KEY is set.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // If no API key configured, respond with 400 and echo transcript if provided for local testing
    if ((req as any).body && (req as any).body.transcript) {
      return res.status(200).json({ transcript: (req as any).body.transcript })
    }
    res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })
    return
  }

  try {
    const { audio, filename } = (req as any).body || {}
    if (!audio) {
      return res.status(400).json({ error: 'No audio provided. Send JSON { audio: "<base64>" }' })
    }

    const buffer = Buffer.from(audio, 'base64')

    const form = new FormData()
    form.append('file', buffer, { filename: filename || 'recording.webm', contentType: 'audio/webm' })
    form.append('model', 'whisper-1')

    const headers = Object.assign({ Authorization: `Bearer ${apiKey}` }, (form as any).getHeaders ? (form as any).getHeaders() : {})
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers,
      body: form as any,
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.error('whisper upstream error', resp.status, txt)
      return res.status(502).json({ error: 'Upstream transcription failed', status: resp.status, detail: txt })
    }

    const data = await resp.json()
    // data.text contains the transcription
    return res.status(200).json({ transcript: data.text })
  } catch (err: any) {
    console.error('whisper handler error', err)
    res.status(500).json({ error: err.message || 'Unknown error' })
  }
}
