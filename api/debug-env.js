export default async function handler(req, res) {
  const raw = process.env.ADMIN_DISCORD_IDS;
  
  return res.status(200).json({
    exists: !!raw,
    raw_value: raw,                          // เห็นค่าจริงที่ Vercel อ่านได้
    raw_length: raw ? raw.length : 0,
    raw_json: raw ? JSON.stringify(raw) : null,  // เห็น space/ซ่อนเร้น
    parsed_list: raw ? raw.split(',').map(s => s.trim()) : [],
    target_id: req.query.id || '1346389669297782845',
    match: raw ? raw.split(',').map(s => s.trim()).includes(req.query.id || '1346389669297782845') : false
  });
}
