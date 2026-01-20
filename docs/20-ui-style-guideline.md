# UI Style Guideline (Non-blocking)
## Grape Greenhouse Smart Farm – Data Visualization

This document defines the **UI design direction** for the Smart Farm Monitoring System.  
It is a **guideline**, not a strict requirement.  
❗ It does NOT enforce pixel-perfect design and should not block implementation.

The goal is to ensure the UI feels like a **real operational system**,  
not a demo, landing page, or marketing dashboard.

---

## 1. Purpose

- Enable fast and continuous data reading
- Support **high information density**
- Suitable for always-on dashboards and daily operational use
- Look and feel like a **production monitoring system**

---

## 2. Design Direction

### Direction Name
**Dense Operational Monitoring Dashboard**

### Core Characteristics
- Dense but readable
- Structured and predictable
- Monitoring-first, not presentation-first
- Calm and professional (not flashy)
- Data > decoration

### Keywords
- Dense
- Operational
- Structured
- Monitoring
- Calm
- Data-first

### Non-Goals
- ❌ Marketing-style layouts
- ❌ Hero sections or storytelling cards
- ❌ Large empty whitespace
- ❌ Heavy animations or transitions
- ❌ Glassmorphism or decorative gradients

---

## 3. Density & Information Richness (CRITICAL)

> This section is essential.  
> The UI MUST prioritize **information density** over visual minimalism.

### Rules
- Prefer **compact components** over large display cards
- Reduce padding and margins compared to marketing dashboards
- Increase **data-per-screen ratio**
- Use borders, dividers, and background layers instead of whitespace
- Dashboards should feel **“busy but controlled”**
- A single screen should show multiple KPIs, charts, and tables together

---

## 4. Layout Structure

### Global Layout
- Persistent **left sidebar** for navigation
- Top bar for page context, search, or user actions
- Main content area uses grid-based layout

### Cards
- Cards should be **compact and low-height**
- Group related metrics into a single card when possible
- Avoid oversized KPI showcase cards

### Sections
- Use clear visual separation:
  - Card containers
  - Subtle borders
  - Light background contrasts
- Avoid large vertical gaps between sections

---

## 5. Color Semantics (Conceptual)

> Define color roles, not specific hex values.

### Background
- Neutral tones (white / light gray / soft dark gray)
- Background exists to **support data**, not attract attention

### Primary Accent
- Muted green or muted blue
- Used for:
  - Active states
  - Key KPIs
  - Primary highlights in charts

### Secondary
- Gray tones
- Used for labels, dividers, borders, secondary text

### Alert Colors
| Severity | Meaning |
|---|---|
| Info | Blue |
| Warning | Yellow / Orange |
| Critical | Red |

- Alert colors must be clear and unambiguous
- Do not use alert colors decoratively

---

## 6. Typography Direction

> Numeric readability has the highest priority.

### Principles
- Sans-serif fonts
- Medium weight (avoid thin fonts)
- Clear numeric glyphs suitable for continuous values

### Hierarchy
1. KPI values
2. Chart values
3. Section titles
4. Labels and units
5. Descriptions / metadata

### Notes
- Units must always be visually secondary to values
- Avoid italics for numbers
- Avoid excessive font size contrast

---

## 7. KPI & Metric Presentation

- Prefer **KPI bars or compact metric cards**
- Display multiple KPIs in a single row when possible
- KPIs should resemble a **control panel**, not a hero section

Example intent:

Temp | RH | VPD | Soil Avg | PAR | EC


---

## 8. Chart Guidelines

### Chart Types
- Line charts are primary
- Area charts only when trend clarity improves

### Density Rules
- Charts should not be overly tall
- Prefer multiple related metrics in one chart
- Use gridlines to support dense data reading

### Thresholds & Alerts
- Use thin threshold lines or subtle shading
- Avoid animated emphasis
- Tooltips must be concise and informative

---

## 9. Tables & Lists (VERY IMPORTANT)

Tables and lists are **core UI elements**, not secondary ones.

### Usage
- Device lists
- Alerts
- Events
- Reports
- Status monitoring

### Style
- Compact row height
- Clear column alignment
- Status represented by badges + text
- Tables should be readable at a glance

---

## 10. Alert Visual Language

### Principles
- Clearly visible but not alarming
- Integrated into dashboard flow
- No popups or modal interruptions

### Usage
- Color + icon + short text
- Alerts appear in:
  - Dashboard
  - Zone detail
  - Alert list page

---

## 11. Interaction Philosophy

- Interactions must be predictable
- Clicks are for navigation, not surprises
- Hover states only when they add clarity
- Loading states should be visible but unobtrusive

---

## 12. Accessibility & Usability

- Sufficient contrast at all times
- Numeric data must remain readable on large screens
- Do not rely on color alone to convey meaning
- Designed for control-room and office displays

---

## 13. Implementation Notes (For Dev / Codex)

- This guideline defines **direction only**
- Developers and AI are allowed to adapt based on constraints
- When trade-offs are required:
  - **Readability > density > aesthetics**
- In case of conflict:
  - Core PRD > System Architecture > Style Guideline

---

## 14. Summary

> A good UI for this system:
> - Feels operational, not promotional
> - Shows a lot of data without confusion
> - Looks busy, but never chaotic
> - Feels like a real monitoring system used every day

Style exists to **support operations and decision-making**,  
not to impress or entertain.
