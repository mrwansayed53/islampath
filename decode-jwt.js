// فك تشفير JWT token لمعرفة معلومات حساب Supabase
const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlY3pzZGVjZ3lhaGdsYXJnd2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE4NjEsImV4cCI6MjA2NDcxNzg2MX0.NMliJLiebIgUFa-CrHA0pI6SVYX0oMYIRasxvqSgudo";

// فصل الأجزاء
const parts = jwt.split('.');
const payload = parts[1];

// فك التشفير
const decoded = JSON.parse(atob(payload));

console.log('🔍 معلومات حساب Supabase:');
console.log('----------------------------');
console.log('المؤسسة (Issuer):', decoded.iss);
console.log('مرجع المشروع (Reference):', decoded.ref);
console.log('الدور (Role):', decoded.role);

// تحويل التواريخ
const issuedAt = new Date(decoded.iat * 1000);
const expiresAt = new Date(decoded.exp * 1000);

console.log('تاريخ الإصدار:', issuedAt.toLocaleString('ar-EG'));
console.log('تاريخ الانتهاء:', expiresAt.toLocaleString('ar-EG'));

console.log('\n🌐 رابط مشروع Supabase:');
console.log(`https://supabase.com/dashboard/project/${decoded.ref}`);

console.log('\n📧 للعثور على الحساب المرتبط:');
console.log('1. اذهب إلى https://supabase.com/dashboard');
console.log('2. ابحث عن مشروع بالاسم:', decoded.ref);
console.log('3. أو ابحث في قائمة مشاريعك عن المشروع الذي يحتوي على هذا المرجع');