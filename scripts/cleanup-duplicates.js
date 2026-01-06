// Script to find and merge duplicate customers
const config = require('../src/config').config;

const supabaseUrl = config.supabase.url;
const supabaseKey = config.supabase.anonKey;

async function fetchCustomers() {
  const res = await fetch(`${supabaseUrl}/rest/v1/customers?select=*&order=created_at.asc`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
  });
  return res.json();
}

async function fetchBookings(customerId) {
  const res = await fetch(`${supabaseUrl}/rest/v1/bookings?customer_id=eq.${customerId}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
  });
  return res.json();
}

async function updateBookings(oldCustomerId, newCustomerId) {
  const res = await fetch(`${supabaseUrl}/rest/v1/bookings?customer_id=eq.${oldCustomerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ customer_id: newCustomerId }),
  });
  return res.ok;
}

async function updateInvoices(oldCustomerId, newCustomerId) {
  const res = await fetch(`${supabaseUrl}/rest/v1/invoices?customer_id=eq.${oldCustomerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ customer_id: newCustomerId }),
  });
  return res.ok;
}

async function updateParsedInvoices(oldCustomerId, newCustomerId) {
  const res = await fetch(`${supabaseUrl}/rest/v1/parsed_invoices?customer_id=eq.${oldCustomerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ customer_id: newCustomerId }),
  });
  return res.ok;
}

async function deleteCustomer(customerId) {
  const res = await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
  });
  return res.ok;
}

async function mergeCustomers(keepCustomer, removeCustomer) {
  console.log(`  Merging ${removeCustomer.id} (${removeCustomer.name}) into ${keepCustomer.id} (${keepCustomer.name})`);

  // Update bookings
  await updateBookings(removeCustomer.id, keepCustomer.id);

  // Update invoices
  await updateInvoices(removeCustomer.id, keepCustomer.id);

  // Update parsed invoices
  await updateParsedInvoices(removeCustomer.id, keepCustomer.id);

  // Merge stats
  const newTotalJobs = (keepCustomer.total_jobs || 0) + (removeCustomer.total_jobs || 0);
  const newTotalSpent = (keepCustomer.total_spent_cents || 0) + (removeCustomer.total_spent_cents || 0);

  await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${keepCustomer.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      total_jobs: newTotalJobs,
      total_spent_cents: newTotalSpent,
      // Keep the better email if one is missing
      email: keepCustomer.email || removeCustomer.email,
    }),
  });

  // Delete the duplicate
  await deleteCustomer(removeCustomer.id);
  console.log(`  Deleted customer ${removeCustomer.id}`);
}

async function main() {
  console.log('Fetching customers...');
  const customers = await fetchCustomers();
  console.log(`Found ${customers.length} customers\n`);

  // Group by cleaned phone number
  const byPhone = {};
  customers.forEach(c => {
    if (c.phone) {
      const clean = c.phone.replace(/\D/g, '').slice(-10);
      if (clean.length >= 10) {
        if (!byPhone[clean]) byPhone[clean] = [];
        byPhone[clean].push(c);
      }
    }
  });

  // Find duplicates
  const duplicates = Object.entries(byPhone).filter(([_, arr]) => arr.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicate customers found!');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate phone groups:\n`);

  for (const [phone, dupes] of duplicates) {
    console.log(`Phone: ${phone}`);
    dupes.forEach(c => {
      console.log(`  - ID: ${c.id}, Name: ${c.name}, Email: ${c.email || 'none'}, Jobs: ${c.total_jobs || 0}, Created: ${c.created_at}`);
    });

    // Keep the oldest one (first created)
    const [keep, ...remove] = dupes;

    for (const dup of remove) {
      await mergeCustomers(keep, dup);
    }
    console.log('');
  }

  console.log('Done! Duplicates merged.');
}

main().catch(console.error);
