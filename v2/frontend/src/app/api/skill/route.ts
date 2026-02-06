import { NextResponse } from 'next/server';
import skill from './content';

export async function GET() {
  return new NextResponse(skill, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
