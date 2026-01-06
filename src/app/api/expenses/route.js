// ============================================
// EXPENSES API - Tax Reporting
// ============================================
// Fetch and aggregate confirmed vendor expenses

import { NextResponse } from 'next/server';
import { config } from '../../../config';

const supabaseUrl = config.supabase.url;
const getSupabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.anonKey;

// ============================================
// GET - Fetch expenses with filters
// ============================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const category = searchParams.get('category');
  const taxYear = searchParams.get('tax_year');
  const status = searchParams.get('status') || 'confirmed';
  const summary = searchParams.get('summary') === 'true';

  try {
    // Build query for vendor expenses only
    let query = `invoice_type=eq.vendor_expense&status=eq.${status}&order=invoice_date.desc`;

    if (startDate) {
      query += `&invoice_date=gte.${startDate}`;
    }
    if (endDate) {
      query += `&invoice_date=lte.${endDate}`;
    }
    if (category && category !== 'all') {
      query += `&expense_category=eq.${category}`;
    }
    if (taxYear) {
      query += `&tax_year=eq.${taxYear}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/parsed_invoices?${query}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch expenses' },
        { status: 500 }
      );
    }

    const expenses = await response.json();

    // Parse line_items JSON
    const processed = expenses.map(exp => ({
      ...exp,
      line_items: typeof exp.line_items === 'string'
        ? JSON.parse(exp.line_items)
        : exp.line_items,
    }));

    // If summary requested, aggregate by category
    if (summary) {
      const categoryTotals = {};
      let grandTotal = 0;

      processed.forEach(exp => {
        const cat = exp.expense_category || 'other';
        if (!categoryTotals[cat]) {
          categoryTotals[cat] = { count: 0, total_cents: 0 };
        }
        categoryTotals[cat].count++;
        categoryTotals[cat].total_cents += exp.total_cents || 0;
        grandTotal += exp.total_cents || 0;
      });

      return NextResponse.json({
        expenses: processed,
        summary: {
          by_category: categoryTotals,
          total_expenses: processed.length,
          grand_total_cents: grandTotal,
        },
      });
    }

    return NextResponse.json(processed);

  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// POST - Export expenses as CSV
// ============================================
export async function POST(request) {
  try {
    const { start_date, end_date, tax_year, format } = await request.json();

    // Build query
    let query = 'invoice_type=eq.vendor_expense&status=eq.confirmed&order=invoice_date.asc';

    if (start_date) {
      query += `&invoice_date=gte.${start_date}`;
    }
    if (end_date) {
      query += `&invoice_date=lte.${end_date}`;
    }
    if (tax_year) {
      query += `&tax_year=eq.${tax_year}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/parsed_invoices?${query}`,
      {
        headers: {
          'apikey': getSupabaseKey(),
          'Authorization': `Bearer ${getSupabaseKey()}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch expenses for export' },
        { status: 500 }
      );
    }

    const expenses = await response.json();

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Date',
        'Invoice #',
        'Vendor',
        'Category',
        'Description',
        'Subtotal',
        'Tax',
        'Fees',
        'Total',
        'Tax Deductible',
      ];

      const rows = expenses.map(exp => {
        const lineItems = typeof exp.line_items === 'string'
          ? JSON.parse(exp.line_items)
          : exp.line_items || [];

        const description = lineItems
          .map(item => item.description)
          .filter(Boolean)
          .join('; ') || 'N/A';

        return [
          exp.invoice_date || '',
          exp.invoice_number || '',
          exp.from_name || '',
          exp.expense_category || 'other',
          `"${description.replace(/"/g, '""')}"`,
          (exp.subtotal_cents / 100).toFixed(2),
          (exp.tax_cents / 100).toFixed(2),
          (exp.fees_cents / 100).toFixed(2),
          (exp.total_cents / 100).toFixed(2),
          exp.is_tax_deductible ? 'Yes' : 'No',
        ];
      });

      // Calculate totals
      const totalSubtotal = expenses.reduce((sum, e) => sum + (e.subtotal_cents || 0), 0);
      const totalTax = expenses.reduce((sum, e) => sum + (e.tax_cents || 0), 0);
      const totalFees = expenses.reduce((sum, e) => sum + (e.fees_cents || 0), 0);
      const grandTotal = expenses.reduce((sum, e) => sum + (e.total_cents || 0), 0);

      rows.push([]);
      rows.push([
        'TOTALS',
        '',
        '',
        '',
        '',
        (totalSubtotal / 100).toFixed(2),
        (totalTax / 100).toFixed(2),
        (totalFees / 100).toFixed(2),
        (grandTotal / 100).toFixed(2),
        '',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="expenses-${tax_year || 'all'}.csv"`,
        },
      });
    }

    // Default: return JSON
    return NextResponse.json({
      expenses,
      total_count: expenses.length,
      grand_total_cents: expenses.reduce((sum, e) => sum + (e.total_cents || 0), 0),
    });

  } catch (error) {
    console.error('Export expenses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
