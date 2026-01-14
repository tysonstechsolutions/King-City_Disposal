// ============================================
// STRIPE CONNECT - ONBOARDING
// ============================================
//
// Creates a Stripe Connect onboarding link for new customers.
// They click this link, connect their bank account, and
// payments flow directly to them.
//
// Usage:
// POST /api/stripe/connect/onboard
// Body: { email, businessName, returnUrl }
//
// Returns: { url: "https://connect.stripe.com/..." }
//
// ============================================

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, businessName, returnUrl } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

    // ========================================
    // 1. CREATE CONNECTED ACCOUNT
    // ========================================
    const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'type': 'express', // Express accounts are easiest for customers
        'country': 'US',
        'email': email || '',
        'business_type': 'company',
        'company[name]': businessName || '',
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
      }),
    });

    const account = await accountResponse.json();

    if (account.error) {
      console.error('Stripe account creation error:', account.error);
      return NextResponse.json(
        { error: account.error.message },
        { status: 400 }
      );
    }

    console.log(`Created Stripe Connect account: ${account.id}`);

    // ========================================
    // 2. CREATE ONBOARDING LINK
    // ========================================
    const linkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'account': account.id,
        'refresh_url': returnUrl || `${siteUrl}/admin/settings?stripe=refresh`,
        'return_url': returnUrl || `${siteUrl}/admin/settings?stripe=success`,
        'type': 'account_onboarding',
      }),
    });

    const link = await linkResponse.json();

    if (link.error) {
      console.error('Stripe link creation error:', link.error);
      return NextResponse.json(
        { error: link.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      accountId: account.id,
      url: link.url,
    });

  } catch (error) {
    console.error('Stripe Connect onboard error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
