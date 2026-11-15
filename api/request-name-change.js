import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { user_id, new_first_name, new_last_name } = req.body;
  const identifier = user_id ? `discord:${user_id}` : null;

  if (!identifier || !new_first_name || !new_last_name) {
    return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบ' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. ดึงข้อมูลตัวละครปัจจุบัน
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('firstname, lastname, name_change_pending')
      .eq('identifier', identifier)
      .maybeSingle();

    if (userError) throw new Error(userError.message);
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'ไม่พบตัวละคร กรุณาลงทะเบียนก่อน' });
    }

    // 2. เช็คว่ามีคำขอค้างอยู่ไหม
    if (currentUser.name_change_pending) {
      return res.status(409).json({ success: false, error: 'คุณมีคำขอเปลี่ยนชื่อรอการอนุมัติอยู่แล้ว' });
    }

    // 3. เช็คชื่อซ้ำกับผู้เล่นอื่น
    const { data: nameTaken } = await supabase
      .from('users')
      .select('identifier')
      .eq('firstname', new_first_name)
      .eq('lastname', new_last_name)
      .neq('identifier', identifier)
      .maybeSingle();

    if (nameTaken) {
      return res.status(409).json({ success: false, error: 'ชื่อนี้ถูกใช้โดยผู้เล่นอื่นแล้ว' });
    }

    // 4. สร้างคำขอในตาราง name_change_requests
    const { error: insertError } = await supabase
      .from('name_change_requests')
      .insert([{
        identifier,
        old_firstname: currentUser.firstname,
        old_lastname: currentUser.lastname,
        new_firstname: new_first_name,
        new_lastname: new_last_name,
        status: 'pending'
      }]);

    if (insertError) throw new Error(insertError.message);

    // 5. ตั้ง flag pending ในตาราง users
    const { error: updateError } = await supabase
      .from('users')
      .update({
        pending_firstname: new_first_name,
        pending_lastname: new_last_name,
        name_change_pending: true
      })
      .eq('identifier', identifier);

    if (updateError) throw new Error(updateError.message);

    // 6. แจ้งเตือนแอดมินผ่าน Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '📋 **มีคำขอเปลี่ยนชื่อใหม่!**',
          embeds: [{
            title: '⚖️ รออนุมัติ: เปลี่ยนชื่อตัวละคร',
            color: 0xF59E0B,
            fields: [
              { name: '🔑 Identifier', value: `\`${identifier}\``, inline: false },
              { name: 'ชื่อเดิม', value: `${currentUser.firstname} ${currentUser.lastname}`, inline: true },
              { name: 'ชื่อใหม่ (ขอ)', value: `${new_first_name} ${new_last_name}`, inline: true }
            ],
            footer: { text: 'แอดมินอนุมัติผ่าน Table Editor: name_change_requests → เปลี่ยน status เป็น approved' }
          }]
        })
      });
    }

    return res.status(200).json({ success: true, message: 'ส่งคำขอเรียบร้อย รอแอดมินอนุมัติ' });

  } catch (error) {
    console.error('❌ Name change request error:', error);
    return res.status(500).json({ success: false, error: error.message || 'เกิดข้อผิดพลาด' });
  }
}
