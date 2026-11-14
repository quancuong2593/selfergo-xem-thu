'use strict';
// Trang thử iPhone (mang-4 mục 2.1). JS thuần, không build: chỉ để biết iPhone làm được
// những việc bộ máy buổi tập cần, trước khi xây giao diện.

const PHACH_MS = 420;
const NHIP_THO = 10; // phách mỗi chiều
const DIU_SAU_GIAY = 30; // cấu hình theo mang-4 mục 2.5
const DUNG_LAI_SAU_GIAY = 5; // mang-4 mục 2.3 (#24)
const phach = (n) => n * PHACH_MS;
const CHU_KY_GIAY = phach(NHIP_THO * 2) / 1000;

const DS_BAI = {
  'ngu-trua-30-phut': { ten: 'Ngủ trưa', file: 'audio/ngu-trua-30-phut.m4a' },
  'thu-1-phut': { ten: 'Thử nhanh 1 phút', file: 'audio/thu-1-phut.m4a' },
};
const KHO = 'thu-iphone-audio-v1';
const KHOA_NHAT_KY = 'thu-iphone.nhat-ky';
const KHOA_MUC = 'thu-iphone.muc';
const KHOA_DO = 'thu-iphone.do';

const MUC = [
  'Phát file m4a 15 phút liền khi màn hình khoá',
  'Nút phát/tạm dừng trên màn hình khoá hoạt động',
  'Phát từ bản đã lưu (blob URL), tạm dừng rồi tiếp tục đúng chỗ',
  'Wake Lock: tab Safari giữ được; màn hình chính bỏ qua êm, tiếng vẫn chạy',
  'Sau donDep(): không hoạt ảnh, không hẹn giờ, Media Session đã xoá',
  'Đăng nhập Google từ màn hình chính (chưa làm: cần backend, bước 9)',
  'Một chạm: chọn bài là phát luôn, cả bài chưa lưu (tải 18 MB) và bài đã lưu',
  'Tạm dừng trên màn hình khoá, chờ 30 giây, bấm phát TRÊN MÀN HÌNH KHOÁ: có tiếng, phát tiếp đúng chỗ',
  'Tạm dừng trên màn hình khoá, chờ 30 giây, mở khoá, bấm Phát TRONG TRANG: có tiếng, phát tiếp đúng chỗ',
];

const $ = (id) => document.getElementById(id);
const audio = $('audio');

// ---------- lưu trên máy: bọc try vì chế độ riêng tư có thể chặn ----------
function docLuu(khoa, macDinh) {
  try {
    const s = localStorage.getItem(khoa);
    return s ? JSON.parse(s) : macDinh;
  } catch {
    return macDinh;
  }
}
function ghiLuu(khoa, giaTri) {
  try {
    localStorage.setItem(khoa, JSON.stringify(giaTri));
  } catch {
    /* không lưu được thì thôi, trang vẫn chạy */
  }
}

// ---------- nhật ký: giữ qua lần tắt app, để đọc lại sau khi mở khoá ----------
let nhatKy = docLuu(KHOA_NHAT_KY, []);
function gio() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}
function ghi(noiDung) {
  nhatKy.push(`${gio()} ${noiDung}`);
  if (nhatKy.length > 300) nhatKy = nhatKy.slice(-300);
  ghiLuu(KHOA_NHAT_KY, nhatKy);
  if (!document.hidden) veNhatKy();
}
function veNhatKy() {
  const ol = $('nhat-ky');
  ol.textContent = '';
  for (let i = nhatKy.length - 1; i >= 0; i--) {
    const li = document.createElement('li');
    li.textContent = nhatKy[i];
    ol.appendChild(li);
  }
}

// ---------- môi trường ----------
const laManHinhChinh =
  navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const coWakeLock = 'wakeLock' in navigator;
const coMediaSession = 'mediaSession' in navigator;
const coCache = 'caches' in window;
function moTaMoiTruong() {
  const ios = (navigator.userAgent.match(/OS (\d+)_(\d+)(?:_(\d+))?/) || []).slice(1).filter(Boolean).join('.');
  return [
    `Chế độ: ${laManHinhChinh ? 'màn hình chính' : 'tab trình duyệt'}`,
    `iOS: ${ios || 'không phải iPhone'}`,
    `Wake Lock: ${coWakeLock ? 'có' : 'không'}`,
    `Media Session: ${coMediaSession ? 'có' : 'không'}`,
    `Cache API: ${coCache ? 'có' : 'không'}`,
  ].join(' · ');
}

// ---------- kết quả đo tự động (giữ qua lần mở sau) ----------
const doLuong = docLuu(KHOA_DO, { khoaLauNhat: 0, tiepTucDungCho: null, donDep: null, motCham: null });
function veTuDong() {
  const ul = $('tu-dong');
  ul.textContent = '';
  const dong = [
    `Mục 1 · lần khoá màn lâu nhất mà tiếng vẫn chạy liền: ${(doLuong.khoaLauNhat / 60).toFixed(1)} phút (cần ≥ 15)`,
    `Mục 3 · tạm dừng rồi tiếp tục: ${
      doLuong.tiepTucDungCho === null ? 'chưa thử' : doLuong.tiepTucDungCho
    }`,
    `Mục 5 · donDep(): ${doLuong.donDep === null ? 'chưa chạy' : doLuong.donDep}`,
    `Mục 7 · một chạm: ${
      Array.isArray(doLuong.motCham) && doLuong.motCham.length ? '\n    ' + doLuong.motCham.join('\n    ') : 'chưa thử'
    }`,
  ];
  for (const s of dong) {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  }
}
function capNhatDo(khoa, giaTri) {
  doLuong[khoa] = giaTri;
  ghiLuu(KHOA_DO, doLuong);
  veTuDong();
}

// ---------- 6 mục tự chấm ----------
const chamMuc = docLuu(KHOA_MUC, MUC.map(() => ''));
function veMuc() {
  const ol = $('muc');
  ol.textContent = '';
  MUC.forEach((ten, i) => {
    const li = document.createElement('li');
    const nhan = document.createElement('div');
    nhan.textContent = ten;
    const chon = document.createElement('select');
    for (const [gt, chu] of [
      ['', 'Chưa thử'],
      ['dat', 'Đạt'],
      ['khong-dat', 'Không đạt'],
    ]) {
      const o = document.createElement('option');
      o.value = gt;
      o.textContent = chu;
      chon.appendChild(o);
    }
    chon.value = chamMuc[i] || '';
    chon.addEventListener('change', () => {
      chamMuc[i] = chon.value;
      ghiLuu(KHOA_MUC, chamMuc);
    });
    li.append(nhan, chon);
    ol.appendChild(li);
  });
}

// ================== Bộ máy buổi tập (thu nhỏ, theo mang-4 mục 2.2–2.7) ==================
let trangThai = 'cho';
let baiId = null;
let blobUrl = null;
let wakeLock = null;
let diu = false;
let daDonDep = false;
let giayConLaiCu = -1;
// Mỗi lần nap() một lượt mới; lượt cũ tải xong thì bỏ, kể cả khi bấm cùng một bài hai lần.
let luotNap = 0;
let batDauLuc = null;
let tamDungTai = null; // currentTime lúc tạm dừng, để so khi tiếp tục
let anLuc = null; // lúc trang bị ẩn (khoá màn hình)
let anTaiGiay = null; // currentTime lúc trang bị ẩn
let tamDungLuc = null; // Date.now() lúc tạm dừng
let anKhiTamDung = false; // trang bị ẩn trong lúc tạm dừng
let dangDungLai = false; // đang dựng lại nguồn: bỏ qua timeupdate về 0 tạm thời
const henGio = new Set();
const boLangNghe = [];

function doiTrangThai(moi) {
  if (trangThai === moi) return;
  ghi(`trạng thái: ${trangThai} → ${moi}`);
  trangThai = moi;
  $('trang-thai').textContent = moi;
  const coBai = moi !== 'cho' && moi !== 'dang-tai' && moi !== 'xong' && moi !== 'loi';
  $('nut-phat').disabled = !(moi === 'san-sang' || moi === 'tam-dung');
  $('nut-tam-dung').disabled = moi !== 'dang-phat';
  $('nut-dung').disabled = !coBai;
  if (coMediaSession && moi === 'dang-phat') navigator.mediaSession.playbackState = 'playing';
  if (coMediaSession && moi === 'tam-dung') navigator.mediaSession.playbackState = 'paused';
}

function nghe(dich, loai, fn) {
  dich.addEventListener(loai, fn);
  boLangNghe.push([dich, loai, fn]);
}

function datHenGio(fn, ms) {
  const id = setTimeout(() => {
    henGio.delete(id);
    fn();
  }, ms);
  henGio.add(id);
  return id;
}
function xoaHenGio() {
  for (const id of henGio) clearTimeout(id);
  henGio.clear();
}

const matMo = () => $('mat-mo').checked;

// Tải trọn file về Cache API rồi đọc lại thành Blob: đúng đường app sẽ đi (mang-4 mục 2.3, 3).
async function layBlob(bai) {
  const url = new URL(bai.file, location.href).href;
  let kho = null;
  if (coCache) {
    try {
      kho = await caches.open(KHO);
      const daCo = await kho.match(url);
      if (daCo) {
        ghi(`đọc từ bản đã lưu trên máy: ${bai.file}`);
        return chuanBlob(await daCo.blob());
      }
    } catch (e) {
      ghi(`Cache API lỗi, tải thẳng: ${e && e.name}`);
      kho = null;
    }
  }
  ghi(`tải về: ${bai.file}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const tong = Number(res.headers.get('content-length')) || 0;
  const manh = [];
  let daTai = 0;
  let phanTramCu = -1;
  const docGia = res.body && res.body.getReader ? res.body.getReader() : null;
  if (docGia) {
    for (;;) {
      const { done, value } = await docGia.read();
      if (done) break;
      manh.push(value);
      daTai += value.length;
      const pt = tong ? Math.floor((daTai / tong) * 100) : 0;
      if (pt !== phanTramCu) {
        phanTramCu = pt;
        $('trang-thai').textContent = `dang-tai ${tong ? pt + '%' : (daTai / 1e6).toFixed(1) + ' MB'}`;
      }
    }
  } else {
    manh.push(new Uint8Array(await res.arrayBuffer()));
  }
  const blob = new Blob(manh, { type: 'audio/mp4' });
  if (kho) {
    try {
      await kho.put(url, new Response(blob, { headers: { 'Content-Type': 'audio/mp4' } }));
      const lai = await kho.match(url);
      ghi(`đã lưu trên máy (${(blob.size / 1e6).toFixed(1)} MB), đọc lại từ bản lưu`);
      veDaLuu();
      if (lai) return chuanBlob(await lai.blob());
    } catch (e) {
      ghi(`không lưu được vào Cache API: ${e && e.name}`);
    }
  }
  return blob;
}
// Safari có lúc trả blob không có type; thiếu type thì <audio> có thể không nhận.
function chuanBlob(b) {
  return b.type ? b : new Blob([b], { type: 'audio/mp4' });
}

async function nap(id) {
  if (trangThai !== 'cho' && trangThai !== 'xong' && trangThai !== 'loi') dung();
  // Lấy lượt sau dung(), vì dung() cũng tăng lượt để huỷ lượt đang tải.
  const luot = ++luotNap;
  daDonDep = false;
  baiId = id;
  giayConLaiCu = -1;
  batDauLuc = null;
  tamDungTai = null;
  tamDungLuc = null;
  anKhiTamDung = false;
  dangDungLai = false;
  $('dong-ho').textContent = '--:--';
  doiTrangThai('dang-tai');
  try {
    const blob = await layBlob(DS_BAI[id]);
    if (luot !== luotNap) return;
    blobUrl = URL.createObjectURL(blob);
    nghe(audio, 'timeupdate', khiTimeupdate);
    nghe(audio, 'play', khiPlay);
    nghe(audio, 'pause', khiPause);
    nghe(audio, 'ended', khiEnded);
    nghe(audio, 'error', khiError);
    nghe(audio, 'loadedmetadata', () => {
      ghi(`loadedmetadata: dài ${audio.duration.toFixed(1)} giây`);
      if (dangDungLai) return;
      capNhatDongHo(true);
    });
    nghe(document, 'visibilitychange', khiDoiHien);
    audio.src = blobUrl;
    ghi(`audio.src = blob URL (${(blob.size / 1e6).toFixed(1)} MB)`);
    doiTrangThai('san-sang');
  } catch (e) {
    ghi(`tải lỗi: ${e && e.message}`);
    doiTrangThai('loi');
  }
}

// Phải gọi thẳng trong sự kiện chạm (quy định tự phát của trình duyệt).
function phat() {
  if (trangThai !== 'san-sang' && trangThai !== 'tam-dung') return;
  if (!batDauLuc) {
    batDauLuc = new Date().toISOString();
    datMediaSession();
  }
  if (dangDungLai) return;
  if (trangThai === 'tam-dung' && tamDungLuc !== null) {
    const daTamDung = (Date.now() - tamDungLuc) / 1000;
    const an = anKhiTamDung;
    if (an || daTamDung >= DUNG_LAI_SAU_GIAY) return dungLaiRoiPhat(daTamDung, an);
    ghi(`phát lại sau ${daTamDung.toFixed(1)} giây tạm dừng, trang không ẩn: phát thẳng`);
  }
  goiPlay();
}

function goiPlay() {
  const p = audio.play();
  if (p && p.catch) p.catch((e) => ghi(`play() bị từ chối: ${e && e.name}`));
  const t0 = audio.currentTime;
  // Không đo được có tiếng hay không; ghi những gì đo được để so với tai nghe.
  setTimeout(() => {
    ghi(
      `sau play() khoảng 2 giây: readyState ${audio.readyState}, paused ${audio.paused}, ` +
        `currentTime ${t0.toFixed(1)} → ${audio.currentTime.toFixed(1)}`,
    );
  }, phach(5));
}

// mang-4 mục 2.3 (#24): tạm dừng lâu hoặc trang đã ẩn thì gán lại chính blob URL, về đúng chỗ,
// rồi mới phát (iPhone: phát lại có khi không chạy, hoặc giây chạy mà không có tiếng).
function dungLaiRoiPhat(daTamDung, an) {
  const viTri = audio.currentTime;
  tamDungLuc = null; // play() bị chặn thì lần chạm sau phát thẳng
  anKhiTamDung = false;
  dangDungLai = true;
  ghi(
    `dựng lại nguồn: tạm dừng ${daTamDung.toFixed(1)} giây, trang ẩn: ${an ? 'có' : 'không'}, ` +
      `readyState trước ${audio.readyState}, vị trí ${viTri.toFixed(1)}`,
  );
  const khiCoMetadata = () => {
    audio.removeEventListener('loadedmetadata', khiCoMetadata);
    if (!dangDungLai || daDonDep) return;
    dangDungLai = false;
    audio.currentTime = viTri;
    datMediaSession();
    goiPlay();
  };
  audio.addEventListener('loadedmetadata', khiCoMetadata);
  audio.src = blobUrl;
  audio.load();
}

function tamDung() {
  if (trangThai === 'dang-phat') audio.pause();
}

function dung() {
  if (trangThai === 'xong') return;
  luotNap++;
  doiTrangThai('xong');
  donDep(false);
}

function danhThuc() {
  if (diu) ghi('chạm màn hình: hết dịu');
  datDiu(false);
  henGioDiu();
}

function datDiu(gt) {
  diu = gt;
  document.documentElement.dataset.diu = gt ? 'true' : 'false';
}

function henGioDiu() {
  xoaHenGio();
  if (trangThai === 'dang-phat' && !matMo()) {
    datHenGio(() => {
      ghi(`sau ${DIU_SAU_GIAY} giây: màn hình dịu`);
      datDiu(true);
    }, DIU_SAU_GIAY * 1000);
  }
}

let soLanPhat = 0; // số lần audio thật sự phát trong trang này (mục 7)
function khiPlay() {
  soLanPhat++;
  tamDungLuc = null;
  anKhiTamDung = false;
  const t = audio.currentTime;
  if (tamDungTai !== null) {
    const lech = Math.abs(t - tamDungTai);
    const kq = `${lech < 0.5 ? 'ĐẠT' : 'LỆCH'}: dừng ở ${tamDungTai.toFixed(2)} giây, phát lại ở ${t.toFixed(2)} giây`;
    ghi(`tiếp tục — ${kq}`);
    capNhatDo('tiepTucDungCho', kq);
    tamDungTai = null;
  } else {
    ghi(`play ở ${t.toFixed(2)} giây`);
  }
  doiTrangThai('dang-phat');
  if (matMo()) giuManHinh();
  henGioDiu();
  dongBoNhip();
}

function khiPause() {
  if (trangThai === 'xong' || audio.ended) return;
  tamDungTai = audio.currentTime;
  tamDungLuc = Date.now();
  anKhiTamDung = document.hidden;
  ghi(`pause ở ${tamDungTai.toFixed(2)} giây${document.hidden ? ' (khi màn hình đang khoá/ẩn)' : ''}`);
  doiTrangThai('tam-dung');
  xoaHenGio();
  datDiu(false);
  nhaManHinh();
  $('vong').classList.add('tam-dung');
}

function khiEnded() {
  ghi('ended: nghe hết bài');
  doiTrangThai('xong');
  donDep(true);
}

function khiError() {
  const loi = audio.error;
  ghi(`lỗi audio: mã ${loi ? loi.code : '?'} ${loi && loi.message ? loi.message : ''}`);
  doiTrangThai('loi');
}

// Ẩn trang thì bỏ qua timeupdate (mang-4 mục 2.3), hiện lại thì đồng bộ một lần.
function khiTimeupdate() {
  if (document.hidden || dangDungLai) return;
  capNhatDongHo(false);
}

function capNhatDongHo(epBuoc) {
  if (!isFinite(audio.duration)) return;
  const con = Math.max(0, Math.ceil(audio.duration - audio.currentTime));
  if (!epBuoc && con === giayConLaiCu) return;
  giayConLaiCu = con;
  const p = Math.floor(con / 60);
  const g = String(con % 60).padStart(2, '0');
  $('dong-ho').textContent = `${p}:${g}`;
}

// Vòng thở chạy bằng CSS; JS chỉ đặt animation-delay âm lúc vào, tiếp tục, hiện lại.
function dongBoNhip() {
  const vong = $('vong');
  const lech = audio.currentTime % CHU_KY_GIAY;
  vong.style.animationDelay = `${-lech * 1000}ms`;
  vong.classList.add('dang-tho');
  vong.classList.remove('tam-dung');
}

function khiDoiHien() {
  if (document.hidden) {
    anLuc = Date.now();
    anTaiGiay = audio.currentTime;
    ghi(`trang bị ẩn (khoá màn hình?) ở ${anTaiGiay.toFixed(1)} giây, trạng thái ${trangThai}`);
    if (trangThai === 'tam-dung') anKhiTamDung = true;
    return;
  }
  veNhatKy();
  if (anLuc !== null) {
    const thucTe = (Date.now() - anLuc) / 1000;
    const tiengChay = audio.currentTime - anTaiGiay;
    ghi(
      `trang hiện lại: ẩn ${(thucTe / 60).toFixed(1)} phút, tiếng chạy được ${(tiengChay / 60).toFixed(1)} phút`,
    );
    // Tiếng chạy gần bằng thời gian thật thì coi là phát liền khi khoá.
    if (tiengChay > doLuong.khoaLauNhat && tiengChay >= thucTe * 0.95 - 2) {
      capNhatDo('khoaLauNhat', tiengChay);
    }
    anLuc = null;
  }
  capNhatDongHo(true);
  // Giống app (#22): iOS có thể bỏ khung phát nhạc khi trang bị treo lúc tạm dừng; đặt lại.
  if (coMediaSession && (trangThai === 'tam-dung' || trangThai === 'dang-phat')) {
    datMediaSession();
    navigator.mediaSession.playbackState = trangThai === 'dang-phat' ? 'playing' : 'paused';
    ghi(`đặt lại Media Session (${trangThai})`);
  }
  if (trangThai === 'dang-phat') {
    dongBoNhip();
    if (matMo()) giuManHinh();
  }
}

// ---------- Wake Lock: thất bại thì bỏ qua êm, chỉ ghi nhật ký ----------
async function giuManHinh() {
  if (!coWakeLock) {
    ghi('Wake Lock: trình duyệt không có, bỏ qua');
    $('khoa-man').textContent = 'Wake Lock: không có (bỏ qua êm)';
    return;
  }
  if (wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    ghi('Wake Lock: đã giữ màn hình');
    $('khoa-man').textContent = 'Wake Lock: đang giữ';
    wakeLock.addEventListener('release', () => {
      ghi('Wake Lock: đã nhả');
      $('khoa-man').textContent = 'Wake Lock: đã nhả';
      wakeLock = null;
    });
  } catch (e) {
    wakeLock = null;
    ghi(`Wake Lock: xin thất bại (${e && e.name}), bỏ qua êm`);
    $('khoa-man').textContent = `Wake Lock: thất bại (${e && e.name}), bỏ qua êm`;
  }
}
function nhaManHinh() {
  if (!wakeLock) return;
  const wl = wakeLock;
  wakeLock = null;
  wl.release().catch(() => {});
}

// ---------- Media Session: chỉ phát/tạm dừng ----------
function datMediaSession() {
  if (!coMediaSession) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({
      title: DS_BAI[baiId].ten,
      artist: 'SelfErgo',
      artwork: [
        { src: new URL('bieu-tuong-512.png', location.href).href, sizes: '512x512', type: 'image/png' },
      ],
    });
  } catch (e) {
    ghi(`MediaMetadata lỗi: ${e && e.name}`);
  }
  ms.setActionHandler('play', () => {
    ghi('màn hình khoá: bấm phát');
    phat();
  });
  ms.setActionHandler('pause', () => {
    ghi('màn hình khoá: bấm tạm dừng');
    tamDung();
  });
  for (const nut of ['seekbackward', 'seekforward', 'previoustrack', 'nexttrack', 'seekto']) {
    try {
      ms.setActionHandler(nut, null);
    } catch {
      /* trình duyệt không biết nút này */
    }
  }
}

// ---------- Dừng sạch (mang-4 mục 2.7) ----------
function donDep(tronBai) {
  if (daDonDep) return;
  daDonDep = true;
  dangDungLai = false;
  tamDungLuc = null;
  const giayDaNghe = audio.currentTime || 0;
  // Hết bài lúc tắt màn thì timeupdate đã bị bỏ qua, mà bộ nghe "hiện lại" sắp bị gỡ:
  // vẽ đồng hồ lần cuối ở đây, trước khi gỡ audio làm mất currentTime.
  capNhatDongHo(true);
  // Gỡ bộ lắng nghe trước, để pause/emptied do chính donDep gây ra không bị xử lý.
  for (const [dich, loai, fn] of boLangNghe) dich.removeEventListener(loai, fn);
  boLangNghe.length = 0;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = null;
  nhaManHinh();
  if (coMediaSession) {
    const ms = navigator.mediaSession;
    ms.metadata = null;
    for (const nut of ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack', 'seekto']) {
      try {
        ms.setActionHandler(nut, null);
      } catch {
        /* như trên */
      }
    }
    ms.playbackState = 'none';
    ghi(`donDep: ngay sau khi xoá, ${moTaMediaSession()}`);
  }
  xoaHenGio();
  datDiu(false);
  const vong = $('vong');
  vong.classList.remove('dang-tho', 'tam-dung');
  vong.style.animationDelay = '';
  $('khoa-man').textContent = 'Wake Lock: chưa xin';
  ghi(
    `donDep: kết quả ${JSON.stringify({ baiId, batDauLuc, giayDaNghe: Math.round(giayDaNghe), tronBai })}`,
  );
  kiemTraSauDonDep();
}

// Tách hai phần để biết phần nào còn sót (lần thử 13/11: 'CÒN' sau khi bài hết lúc đang khoá màn).
function moTaMediaSession() {
  const ms = navigator.mediaSession;
  const md = ms.metadata;
  return `metadata=${md ? `"${md.title}"` : 'null'}, playbackState=${ms.playbackState}${
    document.hidden ? ', trang đang ẩn' : ''
  }`;
}

// Chờ các chuyển động có hồi kết (ví dụ lớp dịu đang mờ ra) chạy xong rồi mới đếm.
async function kiemTraSauDonDep() {
  const coGetAnimations = typeof document.getAnimations === 'function';
  if (coGetAnimations) {
    const coKetThuc = document
      .getAnimations()
      .filter((a) => a.effect && isFinite(a.effect.getComputedTiming().endTime));
    await Promise.all(coKetThuc.map((a) => a.finished.catch(() => {})));
  }
  const soHoatAnh = coGetAnimations ? document.getAnimations().length : -1;
  const ms = coMediaSession ? navigator.mediaSession : null;
  const ketQua = {
    hoatAnh: soHoatAnh,
    henGio: henGio.size,
    mediaSession: ms
      ? ms.metadata === null && ms.playbackState === 'none'
        ? 'đã xoá'
        : `CÒN (${moTaMediaSession()})`
      : 'không có',
    audioSrc: audio.getAttribute('src') ? 'CÒN' : 'đã gỡ',
    wakeLock: wakeLock ? 'CÒN' : 'đã nhả',
  };
  const dat =
    soHoatAnh <= 0 && ketQua.henGio === 0 && !ketQua.mediaSession.startsWith('CÒN') && !wakeLock;
  const chu = `${dat ? 'ĐẠT' : 'KHÔNG ĐẠT'} — hoạt ảnh ${soHoatAnh === -1 ? 'không đếm được' : soHoatAnh}, hẹn giờ ${
    ketQua.henGio
  }, Media Session ${ketQua.mediaSession}, audio ${ketQua.audioSrc}, Wake Lock ${ketQua.wakeLock}`;
  ghi(`kiểm tra sau donDep: ${chu}`);
  capNhatDo('donDep', chu);
}

// ---------- Danh sách bài đã lưu ----------
async function veDaLuu() {
  if (!coCache) {
    $('da-luu').textContent = 'Không có Cache API: mỗi lần mở phải tải lại.';
    return;
  }
  try {
    const kho = await caches.open(KHO);
    const dong = [];
    for (const bai of Object.values(DS_BAI)) {
      const r = await kho.match(new URL(bai.file, location.href).href);
      dong.push(`${bai.ten}: ${r ? 'đã lưu trên máy' : 'chưa lưu'}`);
    }
    $('da-luu').textContent = dong.join(' · ');
  } catch (e) {
    $('da-luu').textContent = `Cache API lỗi: ${e && e.name}`;
  }
}

// ---------- Chép kết quả để dán cho Claude Code ----------
function vanBanKetQua() {
  const dong = ['# Kết quả trang thử iPhone', moTaMoiTruong(), navigator.userAgent, ''];
  MUC.forEach((ten, i) => {
    const c = chamMuc[i] === 'dat' ? 'Đạt' : chamMuc[i] === 'khong-dat' ? 'Không đạt' : 'Chưa thử';
    dong.push(`${i + 1}. ${ten}: ${c}`);
  });
  dong.push('', 'Tự động:');
  for (const li of $('tu-dong').children) dong.push(`- ${li.textContent}`);
  dong.push('', 'Nhật ký (60 dòng cuối):', ...nhatKy.slice(-60));
  return dong.join('\n');
}

async function chepKetQua() {
  const vb = vanBanKetQua();
  const o = $('ban-chep');
  o.value = vb;
  o.hidden = false;
  try {
    await navigator.clipboard.writeText(vb);
    ghi('đã chép kết quả vào bộ nhớ tạm');
  } catch {
    o.focus();
    o.select();
    ghi('không chép tự động được: hãy giữ ngón tay lên ô chữ để chép');
  }
}

// ---------- Khởi động ----------
function khoiDong() {
  document.documentElement.style.setProperty('--phach', `${PHACH_MS}ms`);
  // Không phóng to, giống app (mang-4 mục 1.7, #24).
  const chanPhongTo = (e) => e.preventDefault();
  document.addEventListener('gesturestart', chanPhongTo, { passive: false });
  document.addEventListener('gesturechange', chanPhongTo, { passive: false });
  $('moi-truong').textContent = moTaMoiTruong();
  ghi(`mở trang · ${moTaMoiTruong()}`);

  const chon = $('chon-bai');
  for (const [id, bai] of Object.entries(DS_BAI)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chon';
    b.textContent = bai.ten;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      for (const x of chon.children) x.setAttribute('aria-pressed', String(x === b));
      // Mục 7 (bước 4): app gọi play() sau khi đọc bài từ kho xong, tức là sau một lần chờ.
      // Thử xem Safari còn coi đó là "trong lần chạm" không.
      const motCham = $('mot-cham').checked;
      const chamThem = Number($('cham-them').value);
      const luc = performance.now();
      nap(id)
        .then(() => new Promise((xong) => setTimeout(xong, motCham ? chamThem : 0)))
        .then(() => {
        if (!motCham || trangThai !== 'san-sang') return;
        const cho = Math.round(performance.now() - luc);
        // App thật tạo thẻ <audio> mới mỗi lần mở: lần phát đầu tiên của trang mới là ca khó.
        const lanDau = soLanPhat === 0 ? 'LẦN PHÁT ĐẦU TIÊN của trang' : `audio đã phát ${soLanPhat} lần trước`;
        ghi(`một chạm: gọi play() sau ${cho} ms chờ (${lanDau})`);
        const ghiKq = (kq) =>
          capNhatDo('motCham', [...(Array.isArray(doLuong.motCham) ? doLuong.motCham : []), `${kq} · ${cho} ms · ${lanDau} · ${laManHinhChinh ? 'MH chính' : 'tab'}`].slice(-6));
        const p = audio.play();
        if (p && p.then)
          p.then(
            () => ghiKq('ĐẠT'),
            (e) => ghiKq(`KHÔNG ĐẠT (${e && e.name})`),
          );
        if (!batDauLuc) {
          batDauLuc = new Date().toISOString();
          datMediaSession();
        }
      });
    });
    chon.appendChild(b);
  }

  $('nut-phat').addEventListener('click', phat);
  $('nut-tam-dung').addEventListener('click', tamDung);
  $('nut-dung').addEventListener('click', dung);
  $('lop-diu').addEventListener('click', danhThuc);
  $('mat-mo').addEventListener('change', () => {
    ghi(`chế độ: bài ${matMo() ? 'mở mắt' : 'nhắm mắt'}`);
    if (trangThai !== 'dang-phat') return;
    if (matMo()) {
      xoaHenGio();
      datDiu(false);
      giuManHinh();
    } else {
      nhaManHinh();
      henGioDiu();
    }
  });
  $('xoa-luu').addEventListener('click', async () => {
    try {
      await caches.delete(KHO);
      ghi('đã xoá bản lưu trên máy');
    } catch (e) {
      ghi(`xoá bản lưu lỗi: ${e && e.name}`);
    }
    veDaLuu();
  });
  $('chep').addEventListener('click', chepKetQua);
  $('xoa-nhat-ky').addEventListener('click', () => {
    nhatKy = [];
    ghiLuu(KHOA_NHAT_KY, nhatKy);
    doLuong.khoaLauNhat = 0;
    doLuong.tiepTucDungCho = null;
    doLuong.donDep = null;
    doLuong.motCham = null;
    ghiLuu(KHOA_DO, doLuong);
    veNhatKy();
    veTuDong();
  });

  veMuc();
  veTuDong();
  veDaLuu();
  veNhatKy();
}

khoiDong();
