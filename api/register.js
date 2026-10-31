// api/register.js - Vercel Serverless Function
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // อนุญาตเฉพาะ POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // ตรวจสอบ Environment Variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    console.log('🔍 Checking env vars...');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ exists' : '❌ missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? `✅ exists (length: ${supabaseKey.length})` : '❌ missing');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing Supabase credentials' 
      });
    }

    // ดึงข้อมูลจาก Request
    const { user_id, username, first_name, last_name, date_of_birth, gender } = req.body;

    if (!user_id || !first_name || !last_name || !date_of_birth || !gender) {
      return res.status(400).json({ success: false, error: 'กรอกข้อมูลไม่ครบถ้วน' });
    }

    // เชื่อมต่อ Supabase ด้วย service_role key
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('📝 Inserting player:', { discord_id: user_id, first_name, last_name });

    // บันทึกข้อมูล
    const { data, error: dbError } = await supabase
      .from('players')
      .insert([{
        discord_id: String(user_id),
        discord_username: username || 'Unknown',
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        date_of_birth: date_of_birth,
        gender: gender,
        is_whitelisted: true,
        status: 'approved'
      }])
      .select();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      if (dbError.code === '23505') {
        return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนแล้ว' });
      }
      if (dbError.code === '42501') {
        return res.status(403).json({ 
          success: false, 
          error: 'Permission denied - กรุณาตรวจสอบ SUPABASE_SERVICE_ROLE_KEY ใน Vercel Environment Variables ว่าใช้ service_role key (ไม่ใช่ anon key)' 
        });
      }
      throw new Error(dbError.message);
    }

    console.log('✅ Data inserted:', data);

    // ส่ง Webhook
    if (webhookUrl) {
      try {
        const genderLabels = { male: 'ชาย 👨', female: 'หญิง 👩', other: 'อื่นๆ 🧑' };
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '✅ **ลงทะเบียนใหม่!**',
            embeds: [{
              title: '📝 ผู้เล่นใหม่',
              color: 0x10B981,
              fields: [
                { name: '👤 ชื่อ', value: `${first_name} ${last_name}`, inline: true },
                { name: '🎂 เกิด', value: new Date(date_of_birth).toLocaleDateString('th-TH'), inline: true },
                { name: '⚧ เพศ', value: genderLabels[gender] || 'ไม่ระบุ', inline: true },
                { name: '💬 Discord', value: `<@${user_id}>`, inline: false }
              ],
              timestamp: new Date().toISOString()
            }]
          })
        });
        console.log('✅ Webhook sent');
      } catch (webhookErr) {
        console.warn('⚠️ Webhook failed (non-critical):', webhookErr.message);
      }
    }

    return res.status(200).json({ success: true, message: 'ลงทะเบียนสำเร็จ!' });

  } catch (error) {
    console.error('❌ API Error:', error.message, error.stack);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาด: ' + error.message 
    });
  }
}
