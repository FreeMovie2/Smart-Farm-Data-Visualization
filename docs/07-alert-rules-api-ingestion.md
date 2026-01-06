# Alert Rules & API Ingestion

## Alert Rules (MVP)
- RH > 85%
  - ≥ 5 นาที → Warning
  - ≥ 15 นาที → Critical
- VPD < 0.35 หรือ > 1.6 ≥ 10 นาที
- Soil moisture ต่ำ ≥ 10 นาที
- EC / pH นอกช่วง ≥ 10 นาที
- Device offline ≥ 10 นาที
- Sensor value stuck ≥ 20 นาที

---

## API: Ingestion
POST /v1/ingest  
Header: X-Device-Key

Body:
{
  "deviceId": "dev-01",
  "farmId": "farm-001",
  "zoneId": "zone-1",
  "ts": "2025-12-28T05:20:00Z",
  "metrics": {
    "airTemp": 27.4,
    "airRH": 78,
    "soil1": 29,
    "soil2": 31,
    "soil3": 28,
    "par": 640,
    "ec": 2.05,
    "ph": 6.12,
    "leafWet": 0
  }
}

> NOTE:
> Endpoint นี้ถูกใช้ทั้งโดย
> - sensor จริง (production)
> - mock-generator (demo / mockup)
>
> payload format และ validation ต้องเหมือนกัน 100%

---

## Mock Generator Integration

mock-generator จะทำหน้าที่เสมือน sensor จริง โดย:
- ใช้ `X-Device-Key` ต่อ device
- ยิงข้อมูลตาม interval
- สามารถจำลอง scenario เพื่อ trigger alert:
  - RH สูงต่อเนื่อง
  - Soil moisture ต่ำ
  - Device offline (หยุดยิง)

Alert ที่เกิดจาก mock data ต้องถูกประมวลผลเหมือนข้อมูลจริงทุกประการ

