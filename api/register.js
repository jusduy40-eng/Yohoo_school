import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // รับข้อมูลจาก Frontend (ตรงกับที่เว็บส่งมาจริง)
  const { user_id, username, first_name, last_name, date_of_birth, gender, height } = req.body;

  // ✅ แปลง user_id → identifier format ที่ FiveM ใช้ (discord:xxxxxxxxx)
  const identifier = user_id ? `discord:${user_id}` : null;

  if (!identifier || !first_name || !last_name || !date_of_birth || !gender) {
    return res.status(400).json({ success: false, error: 'กรอกข้อมูลไม่ครบ' });
  }

  // ตรวจสอบ Environment Variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase Environment Variables');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. ตรวจสอบว่ามี identifier นี้ในระบบหรือยัง
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('identifier')
      .eq('identifier', identifier)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(checkError.message);
    }

    if (existingUser) {
      return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนตัวละครไปแล้ว' });
    }

    // 2. แปลงเพศให้เป็น 'm' หรือ 'f' ตามที่ ESX ต้องการ
    const sexValue = gender === 'male' ? 'm' : (gender === 'female' ? 'f' : 'u');
    const heightValue = height ? parseInt(height) : 170;

    // 3. INSERT ลงตาราง users
    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        identifier: identifier,       // เช่น 'discord:1346389669297782845'
        firstname: first_name,
        lastname: last_name,
        dateofbirth: date_of_birth,
        sex: sexValue,
        height: heightValue,
        money: 1500,
        bank: 5000,
        permission_level: 0,
        group: 'user'
      }]);

    if (dbError) {
      console.error('❌ Database Error:', dbError);
      if (dbError.code === '23505') {
        return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนแล้ว' });
      }
      throw new Error(dbError.message);
    }

    // 4. ส่งแจ้งเตือน Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      const genderLabels = { male: 'ชาย 👨', female: 'หญิง 👩', other: 'อื่นๆ 🧑' };
      
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '✅ **ลงทะเบียนตัวละครใหม่สำเร็จ!**',
          embeds: [{
            title: '📝 ข้อมูลตัวละคร',
            color: 0x10B981,
            fields: [
              { name: '👤 ชื่อ-นามสกุล', value: `${first_name} ${last_name}`, inline: true },
              { name: '🎂 วันเกิด', value: new Date(date_of_birth).toLocaleDateString('th-TH'), inline: true },
              { name: '⚧ เพศ', value: genderLabels[gender] || 'ไม่ระบุ', inline: true },
              { name: '🔑 Identifier', value: `\`${identifier}\``, inline: false },
              { name: '💬 Discord', value: username ? `<@${user_id}>` : 'ไม่ระบุ', inline: false }
            ]
          }]
        })
      });
    }

    return res.status(200).json({ success: true, message: 'ลงทะเบียนตัวละครสำเร็จ! สามารถเข้าเกมได้เลย' });

  } catch (error) {
    console.error('❌ Registration Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
}
