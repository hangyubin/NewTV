import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use a short timeout to avoid long waits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout

    const response = await fetch('https://www.youtube.com', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      return new NextResponse('YouTube is not reachable', { status: 503 });
    }
  } catch (error) {
    return new NextResponse('Error checking YouTube connectivity', { status: 500 });
  }
}