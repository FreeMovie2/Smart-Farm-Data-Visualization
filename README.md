# Grape Greenhouse Smart Farm – Data Visualization

ระบบ Smart Farm สำหรับโรงเรือนปลูกองุ่น (3 โซน)  
โฟกัสที่ **Data Visualization, Analysis และ Web-based Alerts**  
ออกแบบเพื่อใช้งานแบบ **on-premise ด้วย Docker**

> ⚠️ ระบบนี้เป็น **Visualization-only (Phase 1)**  
> ❌ ไม่มีการควบคุมอุปกรณ์  
> ❌ ไม่มี notification ภายนอก (LINE / Email / SMS)

---

## 🎯 Objective (สำหรับ AI / Codex)
Repository นี้มีเอกสาร **PRD ที่แยกเป็นหลายไฟล์**  
จุดประสงค์คือให้ AI (เช่น Codex) อ่านเอกสารในโฟลเดอร์ `docs/`  
แล้วสามารถ **สร้างระบบตามสเปกได้อย่างถูกต้องและครบถ้วน**

---

## 🧪 Mock Data Mode (Important for Demo)

ระบบนี้รองรับ **Mock Data Mode** สำหรับการ demo และพัฒนา  
โดยใช้ service ชื่อ `mock-generator` ทำหน้าที่ **ส่งข้อมูลจำลองเข้า ingestion API**
แทนข้อมูลจาก sensor จริง

- mock-generator ยิง `POST /v1/ingest`
- ใช้ payload format เดียวกับ device จริง
- ใช้ `X-Device-Key` เหมือน sensor จริง
- สามารถเปิด/ปิดได้ผ่าน environment variable

> Codex ต้องสร้าง mock-generator ตามสเปกใน  
> `docs/02-system-stack-architecture.md`

---

## 📁 Documentation Structure

เอกสารทั้งหมดอยู่ในโฟลเดอร์ `docs/`  
โปรดอ่านตามลำดับด้านล่าง (สำคัญมาก)

docs/
├── 00-overview.md
├── 01-goals-scope-roles.md
├── 02-system-stack-architecture.md
├── 03-data-metrics-realtime.md
├── 04-pages-dashboard-zone.md
├── 05-pages-alerts-devices.md
├── 06-pages-events-reports.md
├── 07-alert-rules-api-ingestion.md
├── 08-deployment-security.md
└── 99-future-extension.md

---

## 📖 Recommended Reading Order (DO NOT SKIP)

### 1️⃣ Core Context
1. `docs/00-overview.md`  
   → ภาพรวมของระบบ + ขอบเขต Phase 1  
2. `docs/01-goals-scope-roles.md`  
   → เป้าหมาย, สิ่งที่ไม่ทำ, role และ permission

---

### 2️⃣ Technical Foundation
3. `docs/02-system-stack-architecture.md`  
   → Stack ที่ล็อกแล้ว (Next.js, NestJS, TimescaleDB, Docker on-prem) + mock-generator  
4. `docs/03-data-metrics-realtime.md`  
   → Metrics, ความถี่ข้อมูล, realtime policy

---

### 3️⃣ Functional Requirements (Pages)
5. `docs/04-pages-dashboard-zone.md`  
   → Dashboard + Zone Detail  
6. `docs/05-pages-alerts-devices.md`  
   → Alerts (web-only) + Devices (read-only)  
7. `docs/06-pages-events-reports.md`  
   → Events & History + Reports

---

### 4️⃣ Logic & Integration
8. `docs/07-alert-rules-api-ingestion.md`  
   → Alert rules + Ingestion API (สำคัญมาก)  
9. `docs/08-deployment-security.md`  
   → Deployment (Docker) + Security

---

### 5️⃣ Future (Optional)
10. `docs/99-future-extension.md`  
→ แนวทางขยายในอนาคต (ไม่อยู่ใน Phase 1)

---

## 🧠 Key Constraints (Must Follow)

- Frontend: **Next.js**
- Backend: **NestJS**
- Ingestion: **HTTP**
  - 1 request ต่อ device
  - ส่งหลาย metrics
  - Timestamp เป็น **UTC (ISO-8601)**
- Database: **PostgreSQL + TimescaleDB**
- Deployment: **On-premise Docker**
- Alerts: **แสดงบนเว็บเท่านั้น**
- ❌ ไม่มี control / automation / notification

---

## 🧩 Expected System Components

AI / Codex ควรสร้างระบบที่มีอย่างน้อย:
- Next.js Web App (Dashboard, Zone, Alerts, Devices, Events, Reports)
- NestJS API
- Worker process (alert evaluation ทุก 1 นาที)
- **Mock Generator service (ยิง ingest data แทน sensor จริง)**
- TimescaleDB (hypertable + rollup)
- Docker / docker-compose สำหรับ on-prem

---

## 🛠 Suggested Development Flow (for Codex)

1. อ่านเอกสารทั้งหมดใน `docs/` ตามลำดับ
2. สร้างโครงสร้าง repo (web / api / worker / mock-generator)
3. สร้าง database schema ตาม PRD
4. Implement ingestion API (`POST /v1/ingest`)
5. Implement **mock-generator** สำหรับยิงข้อมูลจำลองเข้า ingest
6. Implement alert worker
7. Implement read APIs สำหรับ frontend
8. เชื่อม Next.js กับ API ด้วย polling

---

## 📌 Notes
- เอกสารทั้งหมดใน `docs/` คือ **source of truth**
- mock-generator ใช้สำหรับ demo / mockup เท่านั้น
- ใน production ที่ใช้ sensor จริง สามารถ disable mock-generator ได้
- ถ้ามีข้อขัดแย้ง ให้ยึด:
  - `02-system-stack-architecture.md`
  - `07-alert-rules-api-ingestion.md`
- Phase 1 ต้อง **ไม่** มี feature นอก PRD

---

## 📎 Documents
- `docs/` – Product Requirements Document (แยกไฟล์)
