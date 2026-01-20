// ============================================
// STRIPE CONNECT - CHECK STATUS
// ============================================
//
// Check if a connected account is fully onboarded
// and ready to accept payments.
//
// Usage:
// GET /api/stripe/connect/status?accountId=acct_xxx
//
// ============================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId required' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    });

    const account = await response.json();

    if (account.error) {
      return NextResponse.json(
        { error: account.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      accountId: account.id,
      email: account.email,
      businessName: account.business_profile?.name || account.company?.name,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
      // Ready to accept payments?
      ready: account.charges_enabled && account.payouts_enabled,
    });

  } catch (error) {
    console.error('Stripe Connect status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
