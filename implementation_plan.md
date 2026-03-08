# Refactor: Pemisahan App.jsx → Multi-File Industry Standard

Saat ini seluruh kode (1329 baris) berada di satu file [App.jsx](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx). Tujuannya adalah memisahkan ke struktur folder industri standar React agar mudah di-maintain, di-test, dan dikolaborasikan.

## Struktur Folder Target

```
src/
├── styles/
│   └── global.css          ← CSS variabel tema + animasi (pindah dari inline)
├── constants/
│   ├── theme.js            ← STATUS map, TBGMAP
│   └── devices.js          ← DEVICES array
├── data/
│   └── sensorSimulator.js  ← nextStatus(), genSensor()
├── utils/
│   └── formatters.js       ← Rp(), fmtTime(), fmtDate(), fmtDateTime(), clamp()
├── hooks/
│   ├── useSensorData.js    ← Interval sensor + alert logic
│   └── useToast.js         ← addToast + state toasts
├── components/
│   ├── ui/
│   │   ├── Card.jsx
│   │   ├── Pill.jsx
│   │   ├── Avatar.jsx
│   │   ├── Field.jsx
│   │   ├── Toast.jsx
│   │   └── index.js        ← barrel export
│   ├── charts/
│   │   ├── Gauge.jsx
│   │   └── ChartTip.jsx
│   ├── dashboard/
│   │   ├── MetricCard.jsx
│   │   ├── CostCard.jsx
│   │   ├── AlertCard.jsx
│   │   ├── HistoryTable.jsx
│   │   └── DashboardContent.jsx
│   └── layout/
│       ├── Sidebar.jsx
│       ├── Topbar.jsx
│       └── DashboardShell.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── DeviceListPage.jsx
│   ├── ProfileSettingsPage.jsx
│   └── SystemInfoPage.jsx
├── App.jsx                 ← Hanya root router (~50 baris)
├── main.jsx                ← Tidak berubah
└── index.css               ← Import global.css
```

## Proposed Changes

### Styles
#### [NEW] `src/styles/global.css`
Pindahkan isi `GLOBAL_CSS` template literal dari App.jsx ke file CSS nyata.

---

### Constants & Data
#### [NEW] `src/constants/theme.js`
Export `STATUS` dan `TBGMAP`.

#### [NEW] `src/constants/devices.js`  
Export `DEVICES` array.

#### [NEW] `src/data/sensorSimulator.js`
Export `_ds`, [nextStatus()](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx#89-97), [genSensor()](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx#97-105).

---

### Utils
#### [NEW] `src/utils/formatters.js`
Export [Rp](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx#67-72), [fmtTime](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx#72-73), [fmtDate](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx#73-74), [fmtDateTime](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx#74-78), [clamp](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx#289-293).

---

### Hooks
#### [NEW] `src/hooks/useSensorData.js`
Custom hook yang mengelola state `sensor`, `chartData`, `history`, `alerts`, dan interval update 2 detik.

#### [NEW] `src/hooks/useToast.js`
Custom hook yang mengelola state `toasts` dan fungsi `addToast`.

---

### Components — UI Primitives
#### [NEW] `src/components/ui/Card.jsx`
#### [NEW] `src/components/ui/Pill.jsx`
#### [NEW] `src/components/ui/Avatar.jsx`
#### [NEW] `src/components/ui/Field.jsx`
#### [NEW] `src/components/ui/Toast.jsx`
#### [NEW] `src/components/ui/index.js` — barrel export semua komponen UI

---

### Components — Charts
#### [NEW] `src/components/charts/Gauge.jsx`
#### [NEW] `src/components/charts/ChartTip.jsx`

---

### Components — Dashboard
#### [NEW] `src/components/dashboard/MetricCard.jsx`
#### [NEW] `src/components/dashboard/CostCard.jsx`
#### [NEW] `src/components/dashboard/AlertCard.jsx`
#### [NEW] `src/components/dashboard/HistoryTable.jsx`
#### [NEW] `src/components/dashboard/DashboardContent.jsx`

---

### Components — Layout
#### [NEW] `src/components/layout/Sidebar.jsx`
#### [NEW] `src/components/layout/Topbar.jsx`
#### [NEW] `src/components/layout/DashboardShell.jsx`

---

### Pages
#### [NEW] `src/pages/LoginPage.jsx`
#### [NEW] `src/pages/DeviceListPage.jsx`
#### [NEW] `src/pages/ProfileSettingsPage.jsx`
#### [NEW] `src/pages/SystemInfoPage.jsx`

---

### Root
#### [MODIFY] [src/App.jsx](file:///c:/Users/USER/Desktop/energy-dashboard/src/App.jsx)
Dijadikan hanya ~50 baris berisi root state (dark mode, page routing, user) dan rendering top-level pages.

#### [MODIFY] [src/index.css](file:///c:/Users/USER/Desktop/energy-dashboard/src/index.css)
Tambahkan `@import './styles/global.css';` di baris pertama.

---

## Verification Plan

### Automated Tests
Tidak ada unit test yang ada di codebase. Verifikasi dilakukan via dev server.

### Manual Verification
1. Jalankan dev server:
   ```
   npm run dev
   ```
   di folder `c:\Users\USER\Desktop\energy-dashboard`
2. Buka browser di URL yang ditampilkan (biasanya `http://localhost:5173`)
3. Pastikan halaman **Login** muncul tanpa error console
4. Login dengan email & password apapun → halaman **Device List** muncul
5. Klik perangkat yang **Connected** → **Dashboard** muncul dengan data real-time
6. Verifikasi: gauge bergerak, chart update, alert muncul setelah beberapa detik
7. Navigasi ke **Settings** dan **System Info** → keduanya render normal
8. Toggle dark/light mode → tema berganti
