# Development Plan
## Grape Greenhouse Smart Farm – Data Visualization (Phase 1)

เอกสารนี้คือ **Execution Plan** สำหรับพัฒนา Phase 1  
ออกแบบมาเพื่อให้ AI (เช่น Codex) หรือทีมพัฒนา  
สามารถทำงานตามลำดับได้ **โดยไม่หลุด PRD**

---

## Phase 0 — Preparation & Context Load
**Goal:** ให้เข้าใจระบบตรงกัน 100% ก่อนเขียนโค้ด

### Tasks
- [x] อ่าน `README.md`
- [x] อ่านเอกสารทั้งหมดใน `docs/` ตามลำดับที่กำหนด
- [x] ยืนยัน constraint สำคัญ:
  - Visualization-only
  - Web-based alerts only
  - No control / no notification
  - Stack: Next.js + NestJS + TimescaleDB + Docker on-prem

### Deliverable
- ความเข้าใจระบบตรงตาม PRD (ยังไม่เขียนโค้ด)

---

## Phase 1 — Repository & Infrastructure Setup
**Goal:** ระบบรันได้ด้วย Docker บน on-prem

### Tasks
- [x] สร้าง monorepo structure

apps/web
apps/api
apps/worker
docs/
infra/docker

- [x] สร้าง `docker-compose.yml`
- web (Next.js)
- api (NestJS)
- worker (NestJS)
- db (TimescaleDB)
- redis (optional)
- [x] สร้าง `.env.example`
- [x] ตรวจสอบ `docker-compose up` แล้วทุก service start ได้

### Deliverable
- Docker environment พร้อมใช้งาน

---

## Phase 2 — Database & Time-Series Foundation
**Goal:** รองรับข้อมูล sensor แบบ production-ready

### Tasks
- [x] สร้าง schema:
- farms
- zones
- devices (device_key)
- sensor_readings
- alerts
- events
- [x] แปลง `sensor_readings` เป็น Timescale hypertable
- [x] สร้าง index ที่จำเป็น (zone_id, metric_key, ts)
- [x] สร้าง continuous aggregates
- 5 นาที
- 1 ชั่วโมง
- [x] Seed data:
- 1 farm
- 3 zones
- mock devices

### Deliverable
- Database พร้อมรับ ingestion + query

---

## Phase 3 — Ingestion API (Critical Path)
**Goal:** Device ส่งข้อมูลเข้า DB ได้ถูกต้อง

### Tasks
- [x] Implement `POST /v1/ingest`
- [x] Validate `X-Device-Key`
- [x] Validate payload:
- timestamp เป็น UTC (ISO-8601)
- metrics เป็น key-value
- [x] 1 request → หลาย row ใน `sensor_readings`
- [x] Update `devices.last_seen_at`
- [x] Response `{ ok: true }`

### Deliverable
- Ingestion API ใช้งานได้จริง

---

## Phase 3.5 — Mock Data Generator (Demo Mode)
**Goal:** สร้างข้อมูลจำลองแทน sensor จริง เพื่อใช้ demo และพัฒนา UI

### Tasks
- [x] สร้าง service `mock-generator`
- [x] ยิงข้อมูลเข้า `POST /v1/ingest`
- [x] รองรับ 3 zones (1 device ต่อ zone)
- [x] Generate metrics:
  - airTemp, airRH, soil1–3, par, ec, ph, leafWet
- [x] ใช้ timestamp UTC (ISO-8601)
- [x] Implement realistic patterns:
  - day / night cycle
  - soil dry-down + irrigation spike
- [x] รองรับ scenario mode:
  - realistic
  - stress_alerts
  - device_offline_sim
- [x] เปิด/ปิด mock mode ผ่าน ENV (`MOCK_ENABLED`)

### Deliverable
- ระบบมีข้อมูล time-series ต่อเนื่องโดยไม่ต้องใช้ sensor จริง

---

## Phase 4 — Worker (Alerts & Device Health)
**Goal:** สร้าง logic ตรวจจับความผิดปกติ

### Tasks
- [x] ตั้ง worker ให้รันทุก 1 นาที
- [x] Evaluate alert rules:
- RH
- VPD
- Soil moisture
- EC / pH
- [x] จัดการ alert lifecycle:
- Active
- Acknowledged
- Resolved
- [x] ตรวจจับ device offline (last_seen_at)
- [x] เขียน/อัปเดตตาราง alerts

### Deliverable
- Alerts ถูกสร้างและ resolve อัตโนมัติ

---

## Phase 5 — Backend Read APIs
**Goal:** ให้ Frontend ดึงข้อมูลได้ครบตาม PRD

### Tasks
- [x] Dashboard API
- [x] Zone latest API
- [x] Zone series API (raw / rollup)
- [x] Alerts list + acknowledge
- [x] Devices list (read-only)
- [x] Events list + create (Admin only)
- [x] Reports summary API

### Deliverable
- Backend APIs ครบสำหรับ UI

---

## Phase 6 — Frontend (Next.js Visualization)
**Goal:** Web UI ใช้งานได้จริง

### Tasks
- [x] Setup Next.js layout
- [x] Implement pages:
- Dashboard
- Zone Detail
- Alerts
- Devices
- Events
- Reports
- [x] Implement polling:
- Dashboard 30s
- Zone Detail 15s
- Alerts / Devices 10s
- [x] Integrate charts (ECharts)
- [x] Role-based UI behavior (read-only)

### Deliverable
- Web UI ตรงตาม PRD

---

## Phase 7 — Reports & Export
**Goal:** ใช้งานเชิงบริหารได้

### Tasks
- [x] Summary report logic
- [x] Zone comparison
- [x] Sensor health report
- [x] CSV export
- [x] (Optional) PDF export

### Deliverable
- Reports พร้อมใช้งาน

---

## Phase 8 — Hardening & Validation
**Goal:** ระบบเสถียร ใช้งานหน้างานได้จริง

### Tasks
- [x] Test ingestion load
- [x] Test device offline scenarios
- [x] Validate alert logic
- [x] ตรวจสอบ polling performance
- [x] ทดสอบ Docker restart / recovery

### Deliverable
- Phase 1 production-ready

---

## Definition of Done (Phase 1)
- ✔ Device ส่งข้อมูล → แสดงบน Dashboard
- ✔ Alerts แสดงบนเว็บถูกต้อง
- ✔ Zone Detail วิเคราะห์ย้อนหลังได้
- ✔ Reports export ได้
- ✔ ไม่มี feature นอก PRD

---

## Next Phase (Not in Scope)
- Notification
- Control & Automation
- AI analytics
- Multi-farm support
