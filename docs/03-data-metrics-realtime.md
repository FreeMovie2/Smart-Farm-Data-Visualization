# Data, Metrics & Realtime Policy

## Primary Metrics
- Air Temperature (°C)
- Air Humidity (RH %)
- VPD (kPa)
- Soil Moisture (% – multi-point + avg)
- Light (PAR)
- EC (mS/cm)

## Secondary Metrics
- pH
- Leaf Wetness
- Device health

---

## Sensor Ingestion Frequency
- Air Temp / RH: 1–2 นาที
- Soil Moisture: 3–5 นาที
- Light (PAR): 1 นาที
- EC / pH: 3–5 นาที
- Leaf Wetness: 1 นาที

## Frontend Refresh
- Dashboard: 30s
- Zone Detail: 15s
- Alerts / Devices: 10s

## Alert Evaluation
- Worker ทุก 1 นาที
- ใช้ค่า + ระยะเวลา

---

## Mock Data Mode (Demo / Development)

ระบบรองรับ **Mock Data Mode** สำหรับ demo และพัฒนา UI  
โดยใช้ service `mock-generator` ยิงข้อมูลเข้า ingestion API แทน sensor จริง

### Behavior
- mock-generator จะยิงข้อมูลเข้า `POST /v1/ingest`
- ใช้ payload format เดียวกับ device จริง
- ใช้ timestamp เป็น UTC (ISO-8601)
- ความถี่ default: ทุก 60 วินาที

### Purpose
- ให้กราฟมีข้อมูลต่อเนื่อง
- ให้ alert เกิดจริงตาม rule
- ให้ reports และ history มีข้อมูลใช้งาน

> เมื่อใช้ sensor จริง สามารถ disable mock mode ได้โดยไม่กระทบระบบหลัก
