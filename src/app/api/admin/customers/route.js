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
// GET - List customers with invoice stats
// ============================================
export async function GET(request) {
  try {
    const auth = await requireAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const id = searchParams.get('id')
    const limit = searchParams.get('limit') || '500'

    let query = `order=name.asc&limit=${limit}`

    if (id) {
      query = `id=eq.${id}`
    } else if (search) {
      query += `&or=(name.ilike.*${search}*,phone.ilike.*${search}*,email.ilike.*${search}*,company_name.ilike.*${search}*)`
    }

    const serviceKey = getServiceKey()
    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    // Fetch customers
    const customersResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?${query}`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      }
    )

    if (!customersResponse.ok) {
      const errorText = await customersResponse.text()
      logger.error('Supabase customer fetch error', null, { error: errorText, usingServiceRole, query })
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }

    const customers = await customersResponse.json()

    if (id && customers.length === 0) {
      logger.error('Customer not found by id', null, { id, usingServiceRole, query })
    }

    // Fetch all invoices to calculate stats per customer
    const invoicesResponse = await fetch(
      `${supabaseUrl}/rest/v1/invoices?select=customer_id,total_cents,balance_due_cents,status`,
      {
        headers: {
          'apikey': getServiceKey(),
          'Authorization': `Bearer ${getServiceKey()}`,
        },
      }
    )

    let invoicesByCustomer = {}
    if (invoicesResponse.ok) {
      const invoices = await invoicesResponse.json()
      // Group invoices by customer_id
      invoices.forEach(inv => {
        if (!inv.customer_id) return
        if (!invoicesByCustomer[inv.customer_id]) {
          invoicesByCustomer[inv.customer_id] = {
            total_jobs: 0,
            total_spent_cents: 0,
            outstanding_balance_cents: 0,
          }
        }
        invoicesByCustomer[inv.customer_id].total_jobs += 1
        invoicesByCustomer[inv.customer_id].total_spent_cents += (inv.total_cents || 0)
        // Only count unpaid invoices for outstanding balance
        if (inv.status !== 'paid' && inv.status !== 'void') {
          invoicesByCustomer[inv.customer_id].outstanding_balance_cents += (inv.balance_due_cents || inv.total_cents || 0)
        }
      })
    }

    // Merge invoice stats into customers
    const customersWithStats = customers.map(customer => ({
      ...customer,
      total_jobs: invoicesByCustomer[customer.id]?.total_jobs || 0,
      total_spent_cents: invoicesByCustomer[customer.id]?.total_spent_cents || 0,
      outstanding_balance_cents: invoicesByCustomer[customer.id]?.outstanding_balance_cents || 0,
    }))

    return NextResponse.json(customersWithStats)

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
      logger.error('Supabase customer create error', null, { error: errorText, customerData })
      console.error('Supabase customer create error:', errorText)
      return NextResponse.json({ error: `Failed to create customer: ${errorText}` }, { status: 500 })
    }

    const [customer] = await response.json()
    logger.info('Customer created', { customerId: customer.id, name: customer.name })

    return NextResponse.json({ success: true, customer })

  } catch (error) {
    logger.error('Create customer error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
