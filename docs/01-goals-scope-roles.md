# Goals, Scope & Roles

## Goals
- แสดงข้อมูล sensor แบบ near real-time
- วิเคราะห์เชิงโซนและเชิงเวลา
- ตรวจจับความผิดปกติผ่าน alert บนเว็บ
- มีรายงานสรุปสำหรับผู้บริหาร

## Out of Scope (Phase 1)
- Control / Automation
- Notification (LINE / Email / SMS)
- AI recommendation

---

## Roles
- Owner / Manager
- Operator
- Admin / Technician

## Permission Matrix
| Feature | Owner | Operator | Admin |
|------|------|---------|------|
| Dashboard | ✔ | ✔ | ✔ |
| Zone Detail | ✔ | ✔ | ✔ |
| Alerts | ✔ | ✔ | ✔ |
| Ack Alert | ✔ | ✔ | ✔ |
| Devices | ✔ | ✔ | ✔ |
| Manual Event | ❌ | ❌ | ✔ |
| Export Report | ✔ | ❌ | ✔ |
