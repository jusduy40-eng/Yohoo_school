// ไฟล์นี้ใช้ import ได้ เพราะรันบน Node.js (Vercel Serverless)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { user_id, username, first_name, last_name, date_of_birth, gender } = req.body;

  if (!user_id || !first_name || !last_name) {
    return res.status(400).json({ success: false, error: 'กรอกข้อมูลไม่ครบ' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error: dbError } = await supabase
      .from('players')
      .insert([{
        discord_id: user_id,
        discord_username: username,
        first_name,
        last_name,
        date_of_birth,
        gender,
        is_whitelisted: true,
        status: 'approved'
      }]);

    if (dbError) {
      if (dbError.code === '23505') {
        return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนแล้ว' });
      }
      throw new Error(dbError.message);
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      const genderLabels = { male: 'ชาย 👨', female: 'หญิง 👩', other: 'อื่นๆ 🧑' };
      
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
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
              { name: ' เพศ', value: genderLabels[gender] || 'ไม่ระบุ', inline: true },
              { name: '💬 Discord', value: `<@${user_id}>`, inline: false }
            ]
          }]
        })
      });
    }

    return res.status(200).json({ success: true, message: 'ลงทะเบียนสำเร็จ!' });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาด' });
  }
}
