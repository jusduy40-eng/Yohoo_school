import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // ✅ เช็ค Discord ID ของแอดมินจาก query param
  const adminId = req.query.admin_id;
  if (!adminId) {
    return res.status(401).json({ success: false, error: 'ไม่พบ admin_id' });
  }

  // ✅ เช็ค whitelist จาก env var (ใส่ใน Vercel: ADMIN_DISCORD_IDS="123456,789012")
  const allowedIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(s => s.trim());
  if (!allowedIds.includes(adminId)) {
    return res.status(403).json({ success: false, error: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase
      .from('name_change_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Admin list error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
