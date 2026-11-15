import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { user_id, username, first_name, last_name, date_of_birth, gender, height } = req.body;
  
  // แปลงเป็น format ที่ FiveM ใช้
  const identifier = user_id ? `discord:${user_id}` : null;

  // 🔍 DEBUG: ดูว่าค่าที่รับมาคืออะไร (เช็คใน Vercel Logs)
  console.log('📝 Register attempt for identifier:', identifier);

  if (!identifier || !first_name || !last_name || !date_of_birth || !gender) {
    return res.status(400).json({ success: false, error: 'กรอกข้อมูลไม่ครบ' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase Environment Variables');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. ตรวจสอบว่ามี identifier นี้ในระบบหรือยัง (ใช้ maybeSingle ป้องกัน error ถ้าไม่เจอข้อมูล)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('identifier')
      .eq('identifier', identifier)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Check Error:', checkError);
      throw new Error(checkError.message);
    }

    // 2. ถ้าเจอข้อมูลแล้ว ให้ตีกลับทันที
    if (existingUser) {
      console.log('⚠️ User already exists:', identifier);
      return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนตัวละครไปแล้ว' });
    }

    // 3. แปลงค่าให้ตรงกับ ESX
    const sexValue = gender === 'male' ? 'm' : (gender === 'female' ? 'f' : 'u');
    const heightValue = height ? parseInt(height) : 170;

    // 4. INSERT ลงตาราง users
    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        identifier: identifier,
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
      console.error('❌ Database Insert Error:', dbError);
      if (dbError.code === '23505') { // Unique violation
        return res.status(409).json({ success: false, error: 'บัญชีนี้ลงทะเบียนแล้ว' });
      }
      throw new Error(dbError.message);
    }

    // 5. Discord Webhook
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
              { name: '🔑 Identifier', value: `\`${identifier}\``, inline: false }
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
