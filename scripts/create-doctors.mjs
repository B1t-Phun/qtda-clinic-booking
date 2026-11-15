
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Thiếu SUPABASE URL hoặc SERVICE ROLE KEY");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const PASSWORD = "Clinic@123456";

const specialtyNames = [
  "Nội tổng quát",
  "Nhi khoa",
  "Tim mạch",
  "Da liễu",
  "Tai Mũi Họng",
];

const doctorNames = [
  "Nguyễn Văn An", "Trần Thị Bình",
  "Lê Hoàng Minh", "Phạm Thị Lan",
  "Hoàng Quốc Bảo", "Võ Thị Ngọc",
  "Đặng Minh Tuấn", "Bùi Thanh Hà",
  "Đỗ Quang Huy", "Nguyễn Thị Mai",
  "Trần Quốc Khánh", "Lê Thị Hương",
  "Phạm Minh Đức", "Hoàng Thu Trang",
  "Võ Quốc Việt", "Đặng Thị Thảo",
  "Bùi Văn Nam", "Đỗ Ngọc Anh",
  "Nguyễn Minh Khang", "Trần Thị Yến",
  "Lê Quốc Hưng", "Phạm Ngọc Linh",
  "Hoàng Minh Quân", "Võ Thanh Tâm",
  "Đặng Quốc Dũng", "Bùi Thị Hoa",
  "Đỗ Minh Nhật", "Nguyễn Thu Hà",
  "Trần Văn Phúc", "Lê Ngọc Diệp",
  "Phạm Quốc Thịnh", "Hoàng Thị Vy",
  "Võ Minh Trí", "Đặng Thuỳ Dương",
  "Bùi Quốc Cường", "Đỗ Thanh Huyền",
  "Nguyễn Đức Anh", "Trần Minh Châu",
  "Lê Văn Thành", "Phạm Thị Nhung",
  "Hoàng Quốc Huy", "Võ Ngọc Trâm",
  "Đặng Minh Hoàng", "Bùi Thanh Mai",
  "Đỗ Quốc Bảo", "Nguyễn Thị Kim",
  "Trần Hoàng Long", "Lê Minh Phương",
  "Phạm Văn Khôi", "Hoàng Ngọc Ánh",
];

async function getExistingUser(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}

async function main() {
  // 1. Lấy danh sách chuyên khoa từ database
  const { data: specialties, error: specialtyError } =
    await supabase
      .from("specialties")
      .select("id, name");

  if (specialtyError) throw specialtyError;

  const specialtyMap = new Map(
    specialties.map((s) => [s.name, s.id])
  );

  for (const name of specialtyNames) {
    if (!specialtyMap.has(name)) {
      throw new Error(`Không tìm thấy chuyên khoa: ${name}`);
    }
  }

  console.log("Đã tìm thấy 5 chuyên khoa.");

  let success = 0;
  let failed = 0;

  // 2. Tạo 50 tài khoản
  for (let i = 0; i < 50; i++) {
    const email =
      i === 0
        ? "doctor@clinic.test"
        : `doctor${i + 1}@clinic.test`;

    const fullName = doctorNames[i];
    const specialtyName = specialtyNames[i % 5];
    const specialtyId = specialtyMap.get(specialtyName);

    try {
      // Kiểm tra tài khoản đã tồn tại chưa
      let user = await getExistingUser(email);

      // Nếu chưa có thì tạo trong Supabase Auth
      if (!user) {
        const { data, error } =
          await supabase.auth.admin.createUser({
            email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
            },
          });

        if (error) throw error;
        user = data.user;
      }

      // 3. Tạo hoặc cập nhật profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email,
            full_name: fullName,
            role: "doctor",
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      // 4. Tạo hoặc cập nhật thông tin bác sĩ
      const { error: doctorError } = await supabase
        .from("doctors")
        .upsert(
          {
            profile_id: user.id,
            specialty_id: specialtyId,
            bio: `Bác sĩ chuyên khoa ${specialtyName}`,
            room: `P${String(i + 1).padStart(2, "0")}`,
            years_experience: 2 + (i % 19),
            consultation_fee: 150000 + (i % 5) * 50000,
            is_active: true,
          },
          { onConflict: "profile_id" }
        );

      if (doctorError) throw doctorError;

      success++;

      console.log(
        `[${success}/50] ${email} | ${fullName} | ${specialtyName}`
      );

    } catch (error) {
      failed++;
      console.error(`Lỗi ${email}:`, error.message);
    }
  }

  console.log("\n========== KẾT QUẢ ==========");
  console.log("Thành công:", success);
  console.log("Thất bại:", failed);
  console.log("Mật khẩu chung:", PASSWORD);
}

main().catch(console.error);
