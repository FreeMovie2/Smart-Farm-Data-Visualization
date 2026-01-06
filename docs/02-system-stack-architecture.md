# System Stack & Architecture

เอกสารนี้เป็น **source of truth** ด้านสถาปัตยกรรมและ stack ของระบบ (Phase 1)
โดย Phase 1 เป็น **Visualization-only**:
- ❌ No control / automation
- ❌ No external notification (LINE / Email / SMS)
- ✔ Web-based alerts only

---

## Stack (Locked)

### Frontend
- Next.js
- Polling-based fetching
- Charts: ECharts (recommended)

### Backend
- NestJS (Node.js)
- REST API
- Background worker สำหรับ alert evaluation และ device health

### Data Ingestion
- HTTP
- 1 request ต่อ device ส่งหลาย metrics
- Timestamp เป็น UTC (ISO-8601)

### Database
- PostgreSQL + TimescaleDB
- Hypertable + Continuous Aggregates (5m, 1h)

### Deployment
- On-premise
- Docker / docker-compose

---

## Services (Docker Compose)

ระบบประกอบด้วย service หลักดังนี้:

1) **web** (Next.js)
- UI pages: Dashboard, Zone Detail, Alerts, Devices, Events, Reports
- Polling ตาม policy ใน `docs/03-data-metrics-realtime.md`

2) **api** (NestJS)
- Ingestion endpoint: `POST /v1/ingest` (ใช้ `X-Device-Key`)
- Read APIs สำหรับหน้าเว็บทั้งหมด
- Auth สำหรับ web users (JWT + roles)

3) **worker** (NestJS worker process)
- รันทุก 1 นาที
- Evaluate alert rules (web-only alerts)
- Device health check (offline detection)
- Update/resolve alerts lifecycle

4) **db** (TimescaleDB)
- เก็บ time-series `sensor_readings` เป็น hypertable
- continuous aggregates สำหรับ rollup (5m/1h)

5) **redis** (optional but recommended)
- ใช้สำหรับ job queue / rate limit / caching (ถ้าต้องการ)

6) **mock-generator** (NEW — demo/mockup only)
- สร้างข้อมูลจำลองแทน sensor จริง
- ยิง `POST /v1/ingest` เข้า `api` เป็นช่วงเวลา (interval)
- ใช้ `X-Device-Key` เหมือน device จริง
- สร้าง pattern แบบสมจริง (day/night, irrigation-like spikes) และ scenario เพื่อให้ alert เกิดสำหรับ demo
- เปิด/ปิดได้ด้วย ENV (`MOCK_ENABLED=true/false`)

> NOTE: `mock-generator` เป็นส่วนสำหรับ demo/mockup เท่านั้น
> ใน production ที่ใช้ sensor จริง สามารถ disable ได้โดยไม่กระทบระบบหลัก

---

## Data Flow (Phase 1)

### A) With real sensors (future/optional)
Device (real)
→ HTTP POST `/v1/ingest`
→ API validates `X-Device-Key`
→ write to TimescaleDB (`sensor_readings`)
→ Worker evaluates alerts every 1 min
→ Web polls APIs for visualization

### B) With mock data (current mockup mode)
mock-generator
→ HTTP POST `/v1/ingest` (same payload format)
→ API validates `X-Device-Key`
→ write to TimescaleDB (`sensor_readings`)
→ Worker evaluates alerts every 1 min
→ Web polls APIs for visualization

---

## Mock Data Generator Requirements (mock-generator)

### Purpose
สร้างข้อมูล time-series ต่อเนื่องเพื่อให้ UI/Alerts/Reports ทำงานครบ
โดยไม่ต้องมี sensor จริง

### Behavior
- ส่งข้อมูล 1 payload ต่อ zone ต่อรอบ (recommended)
- 1 request มีหลาย metrics:
  - airTemp, airRH, soil1, soil2, soil3, par, ec, ph, leafWet
- Timestamp เป็น UTC (ISO-8601, Z)

### Realistic Patterns (recommended)
- PAR: กลางวันสูง กลางคืนต่ำ (sinus-like)
- Temp: สูงช่วงบ่าย ต่ำช่วงกลางคืน
- RH: สูงช่วงกลางคืน ต่ำช่วงกลางวัน
- VPD: derived จาก Temp + RH (ให้สอดคล้อง)
- Soil: ลดช้าๆ ต่อเนื่อง + มี spike ขึ้นช่วง irrigation event (จำลอง)
- EC/pH: แกว่งเล็กน้อย + spike บางครั้งเพื่อทดสอบ alert
- LeafWet: มีโอกาสเป็น 1 ในช่วง RH สูงกลางคืน

### Scenarios (optional)
- `realistic` (default)
- `stress_alerts` (ทำให้ alert เกิดบ่อยขึ้นเพื่อ demo)
- `device_offline_sim` (หยุดยิงบาง device ชั่วคราวเพื่อ trigger offline alert)

---

## Environment Variables (suggested)

### API
- `API_PORT=4000`
- `JWT_SECRET=...`
- `DB_HOST=db`
- `DB_PORT=5432`
- `DB_NAME=smart_farm`
- `DB_USER=...`
- `DB_PASSWORD=...`

### Worker
- `WORKER_INTERVAL_SEC=60`

### Mock Generator
- `MOCK_ENABLED=true`
- `MOCK_INTERVAL_SEC=60`
- `API_BASE_URL=http://api:4000`
- `INGEST_PATH=/v1/ingest`
- `MOCK_FARM_ID=farm-001`
- `MOCK_ZONES=zone-1,zone-2,zone-3`
- `MOCK_DEVICE_IDS=dev-01,dev-02,dev-03`
- `MOCK_DEVICE_KEYS=key1,key2,key3`
- `SCENARIO_PROFILE=stress_alerts`
- `SEED=12345`

---

## Notes
- `worker` และ `mock-generator` เป็นคนละ service และมีหน้าที่ต่างกัน:
  - worker: ประเมิน alert/health
  - mock-generator: ป้อนข้อมูลจำลองเข้า ingest
- Phase 1 ใช้ polling เป็นหลัก (ยังไม่ใช้ WebSocket/SSE)
