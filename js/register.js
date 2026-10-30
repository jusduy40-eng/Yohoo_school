// api/register.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. อนุญาตเฉพาะการส่งข้อมูลแบบ POST เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 2. ดึงข้อมูลจาก Request Body
  const { user_id, username, first_name, last_name, date_of_birth, gender } = req.body;

  // 3. ตรวจสอบข้อมูลพื้นฐานว่าครบถ้วน
  if (!user_id || !first_name || !last_name || !date_of_birth || !gender) {
    return res.status(400).json({ success: false, error: 'กรอกข้อมูลไม่ครบถ้วน' });
  }

  // 4. เชื่อมต่อ Supabase (ใช้ Service Role Key เพื่อข้าม RLS และบันทึกข้อมูลได้โดยตรง)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 5. บันทึกข้อมูลลงตาราง players
    const { error: dbError, data } = await supabase
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

    // 6. จัดการข้อผิดพลาดจาก Database
    if (dbError) {
      // รหัส 23505 คือ Unique Violation (เช่น Discord ID หรือ ซ้ำ)
      if (dbError.code === '23505') {
        return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนไปแล้ว' });
      }
      throw new Error(dbError.message);
    }

    // 7. ส่งแจ้งเตือนเข้า Discord Webhook (ถ้ามีการตั้งค่า URL)
    if (process.env.DISCORD_WEBHOOK_URL) {
      const genderLabels = { 
        male: 'ชาย 👨', 
        female: 'หญิง 👩', 
        other: 'อื่นๆ 🧑' 
      };
      
      // แปลงวันที่ให้สวยงาม
      const formattedDate = new Date(date_of_birth).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '✅ **มีการลงทะเบียนสมาชิกใหม่!**',
          embeds: [{
            title: '📝 ข้อมูลผู้เล่นใหม่',
            color: 0x10B981, // สีเขียวมิ้นต์
            fields: [
              { name: '👤 ชื่อ-นามสกุล', value: `${first_name} ${last_name}`, inline: true },
              { name: '🎂 วันเกิด', value: formattedDate, inline: true },
              { name: '⚧ เพศ', value: genderLabels[gender] || 'ไม่ระบุ', inline: true },
              { name: '💬 Discord', value: `<@${user_id}>`, inline: false }
            ],
            footer: { text: 'Yohoo School Registration System' },
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    // 8. ส่งคำตอบกลับไปที่หน้าเว็บว่าสำเร็จ
    return res.status(200).json({ 
      success: true, 
      message: 'ลงทะเบียนสำเร็จ! ยินดีต้อนรับสู่ Yohoo School' 
    });

  } catch (error) {
    console.error('❌ [API Register Error]:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' 
    });
  }
}
