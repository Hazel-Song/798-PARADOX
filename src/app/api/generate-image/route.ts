import { NextRequest, NextResponse } from 'next/server';
import { generateImageWithOpenAI } from '@/lib/api/openai';
import { generateImageWithFAL } from '@/lib/api/fal';

export async function POST(request: NextRequest) {
  try {
    const { prompt, provider = 'fal' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    let result;
    
    if (provider === 'openai') {
      result = await generateImageWithOpenAI(prompt);
    } else if (provider === 'fal') {
      result = await generateImageWithFAL(prompt);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid provider. Use "openai" or "fal"' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}