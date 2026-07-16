/* eslint-disable */
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

async function resetQuota() {
  const target = process.argv[2];
  if (!target) {
    console.log("Cách dùng: node scripts/reset-quota.js <email_hoac_userId>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Lỗi: DATABASE_URL không được định nghĩa trong file .env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log(`Đang tìm kiếm người dùng: "${target}"...`);
    
    // 1. Tìm User bằng Email hoặc ID
    const userRes = await pool.query(
      'SELECT id, email, name FROM "User" WHERE email = $1 OR id = $2',
      [target.trim(), target.trim()]
    );

    if (userRes.rows.length === 0) {
      console.error(`Không tìm thấy người dùng nào khớp với: "${target}"`);
      process.exit(1);
    }

    const user = userRes.rows[0];
    console.log(`Tìm thấy người dùng: ${user.name || 'Không tên'} (${user.email || 'Không email'}), ID: ${user.id}`);

    // 2. Reset các thông số quota về 0
    console.log("Đang reset quota của người dùng này về 0...");
    const updateRes = await pool.query(
      `UPDATE "UserQuota" 
       SET "contractAnalysisCount" = 0, "clauseAnalysisCount" = 0, "comparisonCount" = 0 
       WHERE "userId" = $1`,
      [user.id]
    );

    if (updateRes.rowCount > 0) {
      console.log(`Đã reset thành công hạn ngạch cho người dùng ${user.email || user.id}.`);
    } else {
      // Trường hợp chưa có bản ghi UserQuota (chưa từng dùng ứng dụng)
      console.log("Người dùng này chưa có bản ghi hạn ngạch. Khi họ đăng nhập và sử dụng, hệ thống sẽ tự khởi tạo hạn ngạch ở mức 0.");
    }

    // 3. Hiển thị thông số sau cập nhật
    const quotaRes = await pool.query(
      'SELECT * FROM "UserQuota" WHERE "userId" = $1',
      [user.id]
    );
    if (quotaRes.rows.length > 0) {
      const quota = quotaRes.rows[0];
      console.log("\nThông tin hạn ngạch hiện tại:");
      console.log(`- Lượt phân tích hợp đồng đã dùng: ${quota.contractAnalysisCount} / ${quota.contractAnalysisLimit}`);
      console.log(`- Lượt phân tích điều khoản đã dùng: ${quota.clauseAnalysisCount} / ${quota.clauseAnalysisLimit}`);
      console.log(`- Lượt so sánh đã dùng: ${quota.comparisonCount} / ${quota.comparisonLimit}`);
    }

  } catch (err) {
    console.error("Gặp lỗi khi truy vấn cơ sở dữ liệu:", err);
  } finally {
    await pool.end();
  }
}

resetQuota();
