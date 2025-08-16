import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the API key from environment variables (server-side)
    const apiKey = process.env.SARVAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Sarvam API key not configured' },
        { status: 500 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const languageCode = formData.get('language_code') as string || 'unknown';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Create a new FormData for the Sarvam API request
    const sarvamFormData = new FormData();
    
    // Convert the File to a proper format for Sarvam API
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type });
    
    // Determine the file extension based on the MIME type
    let fileName = 'recording.webm';
    if (audioFile.type.includes('wav')) {
      fileName = 'recording.wav';
    } else if (audioFile.type.includes('mp3')) {
      fileName = 'recording.mp3';
    } else if (audioFile.type.includes('ogg')) {
      fileName = 'recording.ogg';
    }
    
    const file = new File([audioBlob], fileName, { type: audioFile.type });
    
    sarvamFormData.append('file', file);
    sarvamFormData.append('language_code', languageCode);

    // Make the request to Sarvam AI API
    const sarvamResponse = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: sarvamFormData,
    });

    if (!sarvamResponse.ok) {
      const errorText = await sarvamResponse.text();
      console.error('Sarvam API error:', errorText);
      return NextResponse.json(
        { error: `Speech-to-text API error: ${sarvamResponse.status}` },
        { status: sarvamResponse.status }
      );
    }

    const result = await sarvamResponse.json();
    
    if (!result.transcript) {
      return NextResponse.json(
        { error: 'No transcript received from API' },
        { status: 500 }
      );
    }

    // Return the transcript
    return NextResponse.json({
      transcript: result.transcript,
      language_code: result.language_code,
      request_id: result.request_id
    });

  } catch (error) {
    console.error('Speech-to-text API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
