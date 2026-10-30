// api/register.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. ตรวจสอบ Method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 2. ตรวจสอบ Environment Variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase env vars');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing Supabase credentials' 
      });
    }

    // 3. ดึงข้อมูลจาก Request
    const { user_id, username, first_name, last_name, date_of_birth, gender } = req.body;

    if (!user_id || !first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'กรอกข้อมูลไม่ครบ' });
    }

    // 4. เชื่อมต่อ Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 5. บันทึกข้อมูล
    const { error: dbError } = await supabase
      .from('players')
      .insert([{
        discord_id: String(user_id),
        discord_username: username || 'Unknown',
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        date_of_birth: date_of_birth,
        gender: gender || 'other',
        is_whitelisted: true,
        status: 'approved'
      }]);

    if (dbError) {
      console.error('Database error:', dbError);
      if (dbError.code === '23505') {
        return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนแล้ว' });
      }
      throw new Error(dbError.message);
    }

    // 6. ส่ง Webhook (ถ้ามี)
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
              ]
            }]
          })
        });
      } catch (webhookErr) {
        console.warn('Webhook failed (non-critical):', webhookErr.message);
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
