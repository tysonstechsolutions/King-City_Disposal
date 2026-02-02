// ============================================
// ADMIN CUSTOMERS API
// ============================================

import { NextResponse } from 'next/server'
import { config } from '../../../../config'
import { requireAdminAuth } from '../../../../lib/adminAuth'
import { logger } from '../../../../lib/logger'

const supabaseUrl = config.supabase.url
const getServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey

// ============================================
// GET - List customers
// ============================================
export async function GET(request) {
  try {
    const auth = await requireAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = searchParams.get('limit') || '100'

    let query = `order=name.asc&limit=${limit}`

    if (search) {
      query += `&or=(name.ilike.*${search}*,phone.ilike.*${search}*,email.ilike.*${search}*,company_name.ilike.*${search}*)`
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers?${query}`,
      {
        headers: {
          'apikey': getServiceKey(),
          'Authorization': `Bearer ${getServiceKey()}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Supabase customer fetch error', null, { error: errorText })
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    const customers = await response.json()
    return NextResponse.json(customers)

  } catch (error) {
    logger.error('Get customers error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST - Create customer
// ============================================
export async function POST(request) {
  try {
    const auth = await requireAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }

    // Build customer data
    const customerData = {
      name: body.name.trim(),
      phone: body.phone || null,
      email: body.email || null,
      company_name: body.company_name || null,
      is_business: body.is_business || false,
      address: body.address || null,
      city: body.city || null,
      state: body.state || 'IL',
      zip: body.zip || null,
      notes: body.notes || null,
      default_payment_method: body.default_payment_method || 'invoice',
      payment_terms: body.payment_terms || 15,
      is_vip: body.is_vip || false,
      is_flagged: body.is_flagged || false,
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': getServiceKey(),
          'Authorization': `Bearer ${getServiceKey()}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(customerData),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Supabase customer create error', null, { error: errorText })
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    const [customer] = await response.json()
    logger.info('Customer created', { customerId: customer.id, name: customer.name })

    return NextResponse.json({ success: true, customer })

  } catch (error) {
    logger.error('Create customer error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
