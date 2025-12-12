import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, Save, Printer, Trash2, Loader2, CheckCircle2, Download, Upload, FileSpreadsheet, Globe, Lock, Unlock, X, AlertTriangle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// 🔐 ส่วนตั้งค่ารหัสผ่าน Admin
// ==========================================
const ADMIN_PASSWORD = "qwerTyuiop1234"; 

// ==========================================
// ⚙️ ส่วนตั้งค่า Firebase (Configuration) - แก้ไขใหม่ให้เสถียรขึ้น
// ==========================================
let firebaseConfig;

try {
  // 1. พยายามดึงค่าอัตโนมัติ (สำหรับ Canvas)
  // ตรวจสอบว่าตัวแปรมีอยู่จริงไหมก่อนเรียกใช้
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
  }
} catch (e) {
  console.warn("Auto config failed, using manual config.");
}

// 2. ถ้าค่าว่าง หรือหาไม่เจอ ให้ใช้ค่าที่คุณกำหนดเอง (สำหรับ GitHub/Vercel)
// ⚠️⚠️ แก้ไขตรงนี้: ใส่ค่า Config จริงของคุณที่ได้จาก Firebase Console ⚠️⚠️
if (!firebaseConfig) {
  firebaseConfig = {
  apiKey: "AIzaSyDT85bqZgIVKTsoqJHY3-wktIpgTiNgaME",
  authDomain: "yasothon-service.firebaseapp.com",
  projectId: "yasothon-service",
  storageBucket: "yasothon-service.firebasestorage.app",
  messagingSenderId: "848189212038",
  appId: "1:848189212038:web:fb0f41ed30195941991807",
  measurementId: "G-NR3PGN2NG3"
  };
}

// ==========================================
// ส่วนเริ่มระบบ
// ==========================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ==========================================
// ส่วนโปรแกรมหลัก
// ==========================================
const ServiceSummaryApp = () => {
  const initialYear = 2025;
  const initialMonth = 10;
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date(initialYear, initialMonth, 1));
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const fileInputRef = useRef(null);

  const colors = {
    purple: '#4A2C6D',
    red: '#D32F2F',
    orange: '#F57C00',
    yellow: '#FBC02D',
    blue: '#0288D1',
    bg: '#F3F4F6'
  };

  const serviceUnits = [
    "หน่วยบริการคำเขื่อนแก้ว",
    "หน่วยบริการมหาชนะชัย",
    "หน่วยบริการค้อวัง",
    "หน่วยบริการทรายมูล",
    "หน่วยบริการกุดชุม",
    "หน่วยบริการไทยเจริญ",
    "หน่วยบริการเลิงนกทา"
  ];

  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const currentThaiYear = selectedDate.getFullYear() + 543;

  // 1. Authentication Setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
        if (error.code === 'auth/api-key-not-valid' || error.code === 'app/no-options') {
           setErrorMsg("การตั้งค่า Firebase ไม่ถูกต้อง (กรุณาตรวจสอบ API Key ในไฟล์ src/App.jsx)");
        } else {
           setErrorMsg("ไม่สามารถเชื่อมต่อระบบสมาชิกได้");
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setErrorMsg('');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Syncing
  const currentDocId = useMemo(() => {
    const m = selectedDate.getMonth();
    const y = selectedDate.getFullYear();
    return `summary_${y}_${m}`;
  }, [selectedDate]);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    setLoadingMessage('กำลังเชื่อมต่อฐานข้อมูล...');
    
    // Path Structure: /artifacts/{appId}/public/data/{collectionName}/{docId}
    const docPath = `artifacts/${appId}/public/data/service_summary/${currentDocId}`;
    console.log("Connecting to Firestore Path:", docPath);

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'service_summary', currentDocId);

      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data().gridData || {};
          setData(remoteData);
        } else {
          setData({});
        }
        setIsLoading(false);
        setErrorMsg('');
      }, (error) => {
        console.error("Firestore Read Error:", error);
        if (error.code === 'permission-denied') {
           setErrorMsg("ไม่มีสิทธิ์เข้าถึงข้อมูล (Permission Denied) - กรุณาตรวจสอบ Rules");
        } else {
           setErrorMsg(`เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}`);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up listener:", err);
      setErrorMsg("ไม่สามารถตั้งค่าการเชื่อมต่อได้");
      setIsLoading(false);
    }
  }, [user, currentDocId]);

  const simulateLoading = (message = 'กำลังประมวลผล...', duration = 800) => {
    setIsLoading(true);
    setLoadingMessage(message);
    setTimeout(() => {
      setIsLoading(false);
    }, duration);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const days = useMemo(() => getDaysInMonth(selectedDate), [selectedDate]);

  const getDayInfo = (day) => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    return { name: thaiDays[dayOfWeek], isWeekend, dayOfWeek };
  };

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      setShowAdminModal(true);
      setAdminPasswordInput('');
      setLoginError('');
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminModal(false);
    } else {
      setLoginError('รหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleInputChange = (unitIndex, day, value) => {
    const key = `${unitIndex}-${day}`;
    if (value === '' || /^\d+$/.test(value)) {
      const newData = { ...data, [key]: value };
      setData(newData); 
    }
  };

  const saveToFirestore = async (newData = data) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'service_summary', currentDocId);
      await setDoc(docRef, { 
        gridData: newData,
        lastUpdated: new Date(),
        month: selectedDate.getMonth(),
        year: selectedDate.getFullYear(),
        lastModifiedBy: user.uid
      }, { merge: true });
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user) {
        saveToFirestore(data);
      }
    }, 1500); 
    return () => clearTimeout(timeoutId);
  }, [data, user]); 

  const calculateDailyTotal = (day) => {
    let sum = 0;
    serviceUnits.forEach((_, index) => {
      const val = parseInt(data[`${index}-${day}`] || 0);
      sum += val;
    });
    return sum;
  };

  const calculateGrandTotal = () => {
     let sum = 0;
     days.forEach(day => {
       sum += calculateDailyTotal(day);
     });
     return sum;
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    const newDate = new Date(selectedDate.getFullYear(), newMonth, 1);
    setSelectedDate(newDate);
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value) - 543;
    const newDate = new Date(newYear, selectedDate.getMonth(), 1);
    setSelectedDate(newDate);
  };

  const clearData = async () => {
    if(window.confirm('⚠️ คำเตือน: คุณกำลังจะลบ "ข้อมูลส่วนกลาง" ทั้งหมดของเดือนนี้\n\nการกระทำนี้จะส่งผลต่อผู้ใช้งานทุกคนที่กำลังดูหน้านี้อยู่ ยืนยันที่จะลบหรือไม่?')) {
      simulateLoading('กำลังล้างข้อมูลส่วนกลาง...');
      const emptyData = {};
      setData(emptyData);
      if (user) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'service_summary', currentDocId);
        await setDoc(docRef, { gridData: emptyData }, { merge: true });
      }
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "ที่,หน่วยบริการ," + days.map(d => `วันที่ ${d}`).join(",") + "\n";
    serviceUnits.forEach((unit, index) => {
      let row = `${index + 1},"${unit}"`;
      days.forEach(day => {
        row += "," + (data[`${index}-${day}`] || "");
      });
      csvContent += row + "\n";
    });
    let totalRow = ",รวม";
    days.forEach(day => {
      totalRow += "," + calculateDailyTotal(day);
    });
    csvContent += totalRow + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `สรุปบริการ_${thaiMonths[selectedDate.getMonth()]}_${selectedDate.getFullYear()+543}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    simulateLoading('กำลังนำเข้าข้อมูล...');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = text.split('\n');
        const newData = { ...data };
        let unitCount = 0;
        rows.forEach((row, rowIndex) => {
           const cols = row.split(',');
           const unitName = cols[1]?.replace(/"/g, '');
           const unitIndex = serviceUnits.indexOf(unitName);
           if (unitIndex !== -1) {
             days.forEach((day, i) => {
                const val = cols[i + 2]?.trim();
                if (val && /^\d+$/.test(val)) {
                   newData[`${unitIndex}-${day}`] = val;
                }
             });
             unitCount++;
           }
        });
        if (unitCount > 0) {
          setData(newData);
          if (user) {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'service_summary', currentDocId);
             setDoc(docRef, { gridData: newData, lastUpdated: new Date() }, { merge: true });
          }
          alert(`นำเข้าข้อมูลเรียบร้อย (${unitCount} หน่วยบริการ)\nข้อมูลถูกบันทึกขึ้นระบบกลางแล้ว`);
        } else {
          alert("ไม่พบข้อมูลที่ตรงกับรูปแบบตาราง");
        }
      } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
      }
      setIsLoading(false);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handlePrintPDF = () => {
    const originalTitle = document.title;
    document.title = `สรุปบริการ_${thaiMonths[selectedDate.getMonth()]}_${currentThaiYear}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 transition-colors duration-300 relative" style={{ backgroundColor: '#F0F4F8', fontFamily: "'Kanit', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet" />
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#FBC02D]" />
          <p className="text-lg font-medium">{loadingMessage}</p>
        </div>
      )}

      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border-t-4 border-[#4A2C6D]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#4A2C6D] flex items-center gap-2">
                <Lock className="text-[#FBC02D]" /> เข้าสู่ระบบผู้ดูแล
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLoginSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#4A2C6D] focus:border-[#4A2C6D] outline-none transition-all text-gray-800"
                  autoFocus
                  placeholder="กรอกรหัสผ่าน..."
                />
                {loginError && <p className="text-red-500 text-sm mt-1 animate-pulse">{loginError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdminModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-[#4A2C6D] hover:bg-[#382055] rounded-lg shadow-md transition-colors font-medium">เข้าสู่ระบบ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />

      <div className="max-w-[1600px] mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 print-container">
        <div className="p-6 md:p-8 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.purple} 0%, #2c1a42 100%)` }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FBC02D]/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 print:hidden">
                <span className="bg-[#FBC02D] text-[#4A2C6D] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                   <Globe size={12} /> Public Database
                </span>
                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors ${user ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                  <div className={`w-2 h-2 rounded-full ${user ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                  {user ? 'Online' : 'Connecting...'}
                </span>
                {isAdmin && (
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 animate-in fade-in">
                    <Unlock size={12} /> Admin Mode
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-shadow-sm">
                🗓️ แบบสรุปการมารับบริการ
              </h1>
              <p className="text-white/80 font-light text-sm md:text-base flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#FBC02D]" />
                ศูนย์การศึกษาพิเศษ ประจำจังหวัดยโสธร
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-lg flex flex-col sm:flex-row items-center gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <Calendar className="text-[#FBC02D]" size={20} />
                <span className="text-white/90 text-sm font-medium">ประจำเดือน:</span>
              </div>
              <div className="flex gap-2">
                <select 
                  value={selectedDate.getMonth()} 
                  onChange={handleMonthChange}
                  className="bg-white/90 text-[#4A2C6D] border-0 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[#FBC02D] outline-none cursor-pointer shadow-sm hover:bg-white transition-colors"
                >
                  {thaiMonths.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <div className="flex items-center bg-white/90 rounded-lg px-2 shadow-sm focus-within:ring-2 focus-within:ring-[#FBC02D]">
                  <span className="text-[#4A2C6D] text-sm font-bold mr-1">พ.ศ.</span>
                  <input 
                    type="number" 
                    value={currentThaiYear}
                    onChange={handleYearChange}
                    className="w-16 bg-transparent border-none text-[#4A2C6D] font-bold text-center focus:ring-0 p-1 outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="hidden print:block text-right">
                <h3 className="text-xl font-bold">ประจำเดือน {thaiMonths[selectedDate.getMonth()]} พ.ศ. {currentThaiYear}</h3>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 p-4 border-b border-red-200 flex items-center justify-center gap-2 text-red-600 print:hidden">
            <AlertTriangle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-wrap justify-between items-center gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-[#D32F2F]"></span>
               <span className="text-xs text-gray-600">วันหยุด</span>
            </div>
            <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-[#4A2C6D]"></span>
               <span className="text-xs text-gray-600">ยอดรวม: <span className="font-bold text-[#4A2C6D]">{calculateGrandTotal()}</span></span>
            </div>
            {isSaving && (
              <span className="text-xs text-green-600 flex items-center gap-1 ml-2 animate-pulse">
                <Loader2 size={12} className="animate-spin" /> กำลังบันทึก...
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
             {isAdmin ? (
               <>
                <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all">
                  <Upload size={16} /> นำเข้า
                </button>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all">
                  <FileSpreadsheet size={16} /> ส่งออก
                </button>
                <div className="w-px h-8 bg-gray-300 mx-1"></div>
                <button onClick={clearData} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg shadow-md hover:shadow-lg transform active:scale-95 transition-all" style={{ backgroundColor: colors.orange }}>
                  <Trash2 size={16} /> ล้าง
                </button>
                <button onClick={handlePrintPDF} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all">
                  <Printer size={16} /> พิมพ์ / PDF
                </button>
               </>
             ) : (
               <div className="text-sm text-gray-400 italic mr-2 select-none">
                 *เข้าสู่ระบบ Admin เพื่อจัดการข้อมูล
               </div>
             )}
            <button onClick={() => saveToFirestore(data)} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg shadow-md hover:shadow-lg transform active:scale-95 transition-all ml-2" style={{ backgroundColor: colors.blue }}>
              <Save size={16} /> บันทึก
            </button>
            <button 
              onClick={handleAdminToggle}
              className={`ml-2 p-2 rounded-full transition-all ${isAdmin ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
              title={isAdmin ? "ออกจากระบบ Admin" : "เข้าสู่ระบบ Admin"}
            >
              {isAdmin ? <Unlock size={18} /> : <Lock size={18} />}
            </button>
          </div>
        </div>

        <div className="p-4 bg-white">
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-inner custom-scrollbar pb-2">
            <table className="w-full border-collapse min-w-[1200px]">
              <thead>
                <tr className="text-white" style={{ backgroundColor: colors.purple }}>
                  <th rowSpan="3" className="border-r border-white/20 p-3 w-14 text-sm font-medium rounded-tl-lg">ที่</th>
                  <th rowSpan="3" className="border-r border-white/20 p-3 min-w-[220px] text-left text-sm font-medium">
                    🏢 รายชื่อหน่วยบริการ
                  </th>
                  <th colSpan={days.length} className="p-2 text-center text-sm font-bold text-[#4A2C6D] relative" style={{ backgroundColor: colors.yellow }}>
                     <span className="flex items-center justify-center gap-2">
                       📅 ตารางลงเวลาปฏิบัติงาน (วันที่ 1 - {days.length})
                     </span>
                  </th>
                </tr>
                <tr>
                  {days.map(day => {
                    const { name, isWeekend } = getDayInfo(day);
                    return (
                      <th key={`dayname-${day}`} className="p-1 text-[10px] text-center w-9 border-r border-white/10" style={{ backgroundColor: isWeekend ? colors.red : '#2E7D32', color: 'white' }}>{name}</th>
                    );
                  })}
                </tr>
                <tr>
                  {days.map(day => {
                    const { isWeekend } = getDayInfo(day);
                    return (
                      <th key={`datenum-${day}`} className="p-1 text-sm text-center border-r border-white/10 font-light" style={{ backgroundColor: isWeekend ? colors.red : '#4CAF50', color: 'white' }}>{day}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {serviceUnits.map((unit, index) => (
                  <tr key={index} className="group hover:bg-blue-50/50 transition-colors border-b border-gray-100">
                    <td className="p-2 text-center text-sm font-bold text-gray-400 bg-gray-50 border-r border-gray-200 group-hover:bg-blue-100/30">{index + 1}</td>
                    <td className="p-2 text-sm font-medium text-gray-700 border-r border-gray-200 group-hover:text-[#0288D1] transition-colors whitespace-nowrap">{unit}</td>
                    {days.map(day => {
                      const { isWeekend } = getDayInfo(day);
                      return (
                        <td key={day} className={`p-0 h-10 border-r border-gray-100 relative transition-colors ${isWeekend ? 'bg-red-50' : ''}`}>
                          <input type="text" maxLength={3} placeholder={isWeekend ? "-" : ""} value={data[`${index}-${day}`] || ''} onChange={(e) => handleInputChange(index, day, e.target.value)} className={`input-cell w-full h-full text-center text-sm bg-transparent outline-none transition-all duration-200 ${isWeekend ? 'text-red-500 placeholder-red-200 font-medium' : 'text-gray-700 font-bold hover:bg-blue-50 focus:bg-white'}`}/>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="shadow-lg relative z-10" style={{ backgroundColor: '#E3F2FD' }}>
                  <td colSpan="2" className="p-3 text-right font-bold text-sm text-[#0288D1] border-r border-blue-200">📊 รวมยอดรายวัน</td>
                  {days.map(day => {
                     const total = calculateDailyTotal(day);
                     return <td key={`total-${day}`} className="p-2 text-center text-sm font-bold text-[#0288D1] border-r border-blue-200 bg-blue-50">{total > 0 && <span className="inline-block px-1.5 py-0.5 rounded bg-[#0288D1] text-white text-xs shadow-sm">{total}</span>}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 print:hidden">
          <div>ระบบฐานข้อมูลกลาง: Firestore (Google Cloud) | สถานะ: {user ? 'เชื่อมต่อสมบูรณ์' : 'กำลังเชื่อมต่อ...'}</div>
          <div className="flex gap-4">
             <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#D32F2F]"></div> เสาร์-อาทิตย์</span>
             <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#4CAF50]"></div> วันทำการ</span>
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { background: white !important; font-family: 'Sarabun', sans-serif; -webkit-print-color-adjust: exact; }
          .shadow-xl, .shadow-lg, .shadow-md { box-shadow: none !important; }
          .rounded-3xl, .rounded-2xl, .rounded-xl { border-radius: 0 !important; }
          button, .loading-overlay, input[type="file"], .admin-controls { display: none !important; }
          .min-h-screen { padding: 0 !important; }
          .max-w-[1600px] { max-width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100% !important; font-size: 10pt; }
          input { border: none !important; text-align: center; background: transparent !important; padding: 0 !important; margin: 0 !important; width: auto !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
};

export default ServiceSummaryApp;
