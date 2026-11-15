import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { request_id, action, admin_id, review_notes } = req.body;

  if (!request_id || !action || !admin_id) {
    return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบ' });
  }

  // ✅ ตรวจสอบสิทธิ์แอดมินผ่าน Discord ID Whitelist (แทน ADMIN_SECRET)
  const allowedIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(s => s.trim());
  if (!allowedIds.includes(admin_id)) {
    return res.status(403).json({ success: false, error: 'คุณไม่มีสิทธิ์ดำเนินการนี้ (Unauthorized Admin)' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. ดึงข้อมูลคำขอเดิมมาก่อน
    const { data: request, error: fetchError } = await supabase
      .from('name_change_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ success: false, error: 'ไม่พบคำขอนี้' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'คำขอนี้ถูกดำเนินการไปแล้ว' });
    }

    let updateUserData = {};
    let logColor = 0xEF4444; // Default Red (Rejected)
    let logTitle = '❌ ปฏิเสธการเปลี่ยนชื่อ';

    // 2. ดำเนินการตาม Action
    if (action === 'approve') {
      logColor = 0x10B981; // Green
      logTitle = '✅ อนุมัติการเปลี่ยนชื่อ';
      
      // อัปเดตชื่อในตาราง users
      updateUserData = {
        firstname: request.new_firstname,
        lastname: request.new_lastname,
        name_change_pending: false,
        pending_firstname: null,
        pending_lastname: null
      };

      const { error: userUpdateError } = await supabase
        .from('users')
        .update(updateUserData)
        .eq('identifier', request.identifier);

      if (userUpdateError) throw new Error('อัปเดตชื่อผู้เล่นไม่สำเร็จ: ' + userUpdateError.message);

    } else if (action === 'reject') {
      // แค่ยกเลิกสถานะ pending ในตาราง users
      updateUserData = {
        name_change_pending: false,
        pending_firstname: null,
        pending_lastname: null
      };

      const { error: userUpdateError } = await supabase
        .from('users')
        .update(updateUserData)
        .eq('identifier', request.identifier);

      if (userUpdateError) throw new Error('ยกเลิกสถานะ pending ไม่สำเร็จ: ' + userUpdateError.message);
    } else {
      return res.status(400).json({ success: false, error: 'Action ไม่ถูกต้อง' });
    }

    // 3. อัปเดตสถานะในตาราง Log (name_change_requests)
    const { error: logUpdateError } = await supabase
      .from('name_change_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: admin_id,
        review_notes: review_notes || (action === 'approve' ? 'อนุมัติเรียบร้อย' : 'ไม่อนุมัติ'),
        reviewed_at: new Date().toISOString()
      })
      .eq('id', request_id);

    if (logUpdateError) throw new Error(logUpdateError.message);

    // 4. 📝 ยิง Log เข้า Discord Admin Channel
    if (process.env.ADMIN_LOG_WEBHOOK_URL) {
      await fetch(process.env.ADMIN_LOG_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: logTitle,
            color: logColor,
            fields: [
              { name: '🔑 Identifier', value: `\`${request.identifier}\``, inline: false },
              { name: 'ชื่อเดิม', value: `${request.old_firstname} ${request.old_lastname}`, inline: true },
              { name: 'ชื่อใหม่', value: `${request.new_firstname} ${request.new_lastname}`, inline: true },
              { name: '👮 ดำเนินการโดย', value: `<@${admin_id}>`, inline: true },
              { name: '📝 หมายเหตุ', value: review_notes || '-', inline: false }
            ],
            footer: { text: `Request ID: ${request_id}` },
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: action === 'approve' ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธเรียบร้อย' 
    });

  } catch (error) {
    console.error('❌ Admin Name Change Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
