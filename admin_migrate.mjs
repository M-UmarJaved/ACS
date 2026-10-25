import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  console.log("Starting Data Migration...");
  
  const { data: students, error: fetchErr } = await supabase.from('students').select('id, fee_history');
  if (fetchErr) { console.error("Error fetching students:", fetchErr); process.exit(1); }
  
  let feeRecordsToInsert = [];
  let transactionsToInsert = [];
  
  console.log(`Fetched ${students.length} students. Parsing fee histories...`);
  
  for (const s of students) {
    const history = s.fee_history || [];
    for (const h of history) {
      if (!h.month) continue;
      
      const recordId = crypto.randomUUID();
      
      feeRecordsToInsert.push({
        id: recordId,
        student_id: s.id,
        month: h.month,
        tuition_fee: Number(h.tuitionFee) || 0,
        lab_fee: Number(h.labFee) || 0,
        exam_fee: Number(h.examFee) || 0,
        admission_fee: Number(h.admissionFee) || 0,
        late_fine: Number(h.lateFine) || 0,
        discount: Number(h.discount) || 0,
        paid_amount: Number(h.paidAmount) || 0,
        status: h.status || 'unpaid',
        paid_on: h.paidOn || null
      });
      
      const txs = h.transactions || [];
      for (const tx of txs) {
        transactionsToInsert.push({
          fee_record_id: recordId,
          student_id: s.id,
          month_label: h.month,
          amount: Number(tx.amount) || 0,
          payment_date: tx.date || new Date().toLocaleDateString(),
          note: tx.note || ''
        });
      }
    }
  }
  
  console.log(`Ready to insert ${feeRecordsToInsert.length} fee records and ${transactionsToInsert.length} transactions.`);
  
  // Chunk records
  const chunkSize = 200;
  for (let i = 0; i < feeRecordsToInsert.length; i += chunkSize) {
    const chunk = feeRecordsToInsert.slice(i, i + chunkSize);
    const { error: insertErr } = await supabase.from('fee_records').insert(chunk);
    if (insertErr) {
      console.error(`Error inserting fee_records chunk:`, insertErr);
    } else {
      console.log(`Inserted ${i + chunk.length}/${feeRecordsToInsert.length} fee records.`);
    }
  }

  // Chunk txs
  for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
    const chunk = transactionsToInsert.slice(i, i + chunkSize);
    const { error: insertErr } = await supabase.from('fee_transactions').insert(chunk);
    if (insertErr) {
      console.error(`Error inserting fee_transactions chunk:`, insertErr);
    } else {
      console.log(`Inserted ${i + chunk.length}/${transactionsToInsert.length} transactions.`);
    }
  }
  
  console.log("MIGRATION COMPLETE!");
})();
