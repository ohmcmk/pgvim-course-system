// 1. นำเข้าโมดูล Firebase Core, Auth และ Firestore SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, getDocs, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. นำข้อมูล Firebase Config จากหน้า Console ของคุณมาใส่แทนที่ชุดนี้
const firebaseConfig = {
  apiKey: "AIzaSyYOUR_API_KEY",
  authDomain: "pgvim-course-system.firebaseapp.com",
  projectId: "pgvim-course-system",
  storageBucket: "pgvim-course-system.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcd1234efgh"
};

// เริ่มต้นระบบงานของแอปพลิเคชัน
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ผูกตัวแปร State ตัวแอปพลิเคชันหลัก (ยึดตามโครงสร้างเดิมใน script.html)
let currentUser = null;
let optionSettingsCache = null;
// ... ใส่ตัวแปร Cache อื่น ๆ ทั้งหมดตาม script.html เดิมของคุณ ...

// 3. ระบบยืนยันตัวตนและการเข้าถึง (แทน Session.getEffectiveUser())
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: "pgvim.ac.th" }); // ล็อกให้เข้าได้เฉพาะอีเมลโดเมนสถาบัน

$('#btn-login').on('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert("การเข้าสู่ระบบล้มเหลว: " + error.message);
  }
});

// ฟังเสียงสถานะการล็อกอินและสิทธิ์ของผู้ใช้งาน
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // ดึงโปรไฟล์ตรวจสอบระดับสิทธิ์จากคอลเลกชัน 'users' บน Firestore
    const userDocRef = doc(db, "users", user.email);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      currentUser = { email: user.email, ...userSnap.data() };
      
      // ปิดหน้าจอ Login และเปิดแอปพลิเคชันทำงาน
      $('#login-container').fadeOut(() => {
        $('#app').css('display', 'flex').hide().fadeIn();
        initApplicationLogic(); // เรียกฟังก์ชันเริ่มต้นใช้งานโปรแกรมที่มีอยู่เดิมของคุณ
      });
    } else {
      await signOut(auth);
      alert("ขออภัย: อีเมลนี้ไม่ได้รับสิทธิ์เข้าใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ");
    }
  } else {
    // เด้งกลับไปหน้าล็อกอินหากหลุดสถานะล็อกอิน
    $('#app').hide();
    $('#login-container').show();
  }
});

// 4. วิธีแก้ฟังก์ชันการเชื่อมโยงข้อมูลระบบ (ตัวอย่างการแปลงสเต็ปคำสั่งเดิม)

// ตัวอย่างที่ 1: การโหลด Option Settings (เดิมใช้เรียก google.script.run.getOptionSettings())
async function loadOptionSettings(successHandler) {
  if (optionSettingsCache) {
    successHandler(optionSettingsCache);
    return;
  }
  try {
    const docRef = doc(db, "settings", "optionSettings");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      optionSettingsCache = docSnap.data();
    } else {
      // ดึงจากฟังก์ชันค่าเริ่มต้นเดิมที่คุณมีในสคริปต์
      optionSettingsCache = getDefaultOptionSettings(); 
    }
    successHandler(optionSettingsCache);
  } catch (e) {
    console.error("โหลดข้อกำหนดตั้งค่าล้มเหลว:", e);
    successHandler(getDefaultOptionSettings());
  }
}

// ตัวอย่างที่ 2: การบันทึกหลักสูตรและจัดทำ Syllabi (เดิมอยู่ในไฟล์ Code.gs บรรทัดที่ 26)
async function saveSyllabus(syllabuData) {
  try {
    $('#loader').show();
    const collectionRef = collection(db, "syllabi");
    
    if (syllabuData.syllabuId) {
      // โหมดแก้ไข: ปรับปรุงข้อมูลตัวเดิมบนเอกสาร Firestore
      const docRef = doc(db, "syllabi", syllabuData.syllabuId);
      await setDoc(docRef, {
        ...syllabuData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.email
      }, { merge: true });
    } else {
      // โหมดสร้างใหม่: เพิ่มเอกสารชุดใหม่ลงคอลเลกชัน
      const newDocRef = doc(collectionRef); // สร้าง ID อัตโนมัติระบุตำแหน่งเอกสาร
      await setDoc(newDocRef, {
        ...syllabuData,
        syllabuId: newDocRef.id,
        createdAt: serverTimestamp(),
        createdBy: currentUser.email,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.email
      });
    }
    alert("บันทึกข้อมูลประมวลรายวิชาเสร็จสิ้น!");
    // เรียกใช้ฟังก์ชัน Render หน้าเว็บเดิมของคุณต่อได้เลย
  } catch (error) {
    alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
  } finally {
    $('#loader').hide();
  }
}

// ⚠️ สำคัญมาก: เนื่องจากฟังก์ชันเก่าใน HTML มักจะเรียก inline events (เช่น onclick="changeTablePage(...)")
// ในรูปแบบสคริปต์ประเภทโมดูล (type="module") เราต้องส่งฟังก์ชันส่งต่อไปที่ออบเจกต์ window เพื่อให้ตรวจจับเจอครับ
window.changeTablePage = changeTablePage;
// ... ใส่ส่งต่อฟังก์ชันเดิมตัวอื่น ๆ ที่ต้องเรียกจากปุ่มหน้าจอฝั่ง HTML ตรงนี้ ...