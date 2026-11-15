import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { user_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'ไม่พบ user_id' });
  }

  const identifier = `discord:${user_id}`;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('identifier', identifier)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลตัวละคร กรุณาลงทะเบียน' });
    }

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Profile Fetch Error:', error);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
}
