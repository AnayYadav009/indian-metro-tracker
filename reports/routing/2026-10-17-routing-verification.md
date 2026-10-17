# Operational Routing Verification Report

**Date:** 2026-10-17  
**Scope:** All 21 cities and 47 operational metro lines in India  
**Auditor:** Automated Transit Topology & Geometric Routing Verifier  

---

## 1. Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Cities Evaluated** | **21** |
| **Total Operational Lines** | **47** |
| **Lines Passing All Verification Checks** | **41 / 47** |
| **Fully Routable Cities** | **14** |
| **Partly Routable Cities** | **3** |
| **Non-Routable Cities** | **4** |

---

## 2. City Classification Overview

| City | Operational Stations | Operational Lines | Status | Connected Components | Reason / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gurugram** (`gurugram`) | 11 | 1 | ❌ Non-Routable | 1 | All operational lines fail verification checks: Rapid Metro (Missing reference terminal(s) at segment ends: Cyber City) |
| **Navi Mumbai** (`navi-mumbai`) | 11 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Chennai** (`chennai`) | 41 | 2 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Pune** (`pune`) | 28 | 2 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Bengaluru** (`bengaluru`) | 83 | 3 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Mumbai** (`mumbai`) | 77 | 6 | ⚠️ Partly Routable | 2 | 6 of 6 lines pass all verification checks. Failing lines: . Connected components: 2. |
| **Kolkata** (`kolkata`) | 55 | 5 | ⚠️ Partly Routable | 2 | 5 of 5 lines pass all verification checks. Failing lines: . Connected components: 2. |
| **Hyderabad** (`hyderabad`) | 57 | 3 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Ahmedabad** (`ahmedabad`) | 53 | 4 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Noida** (`noida`) | 21 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Delhi** (`delhi`) | 231 | 9 | ⚠️ Partly Routable | 1 | 5 of 9 lines pass all verification checks. Failing lines: Green Line, Airport Express, Pink Line, Magenta Line. Connected components: 1. |
| **Indore** (`indore`) | 16 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Bhopal** (`bhopal`) | 8 | 1 | ❌ Non-Routable | 1 | All operational lines fail verification checks: Orange Line (Line 2) (Missing reference terminal(s) at segment ends: Karond Circle) |
| **Nagpur** (`nagpur`) | 37 | 2 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Surat** (`surat`) | 0 | 0 | ❌ Non-Routable | 0 | Surat Metro has 0 operational stations. |
| **Kochi** (`kochi`) | 25 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Lucknow** (`lucknow`) | 21 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Kanpur** (`kanpur`) | 14 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Agra** (`agra`) | 6 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Jaipur** (`jaipur`) | 11 | 1 | ✅ Routable | 1 | All lines passed terminal, count, gap, and projection checks. |
| **Patna** (`patna`) | 5 | 1 | ❌ Non-Routable | 1 | Patna Metro has no operational lines to verify. |

---

## 3. Operational Line Verification Matrix

For each operational line, five critical topology and geometry criteria are audited:
1. **Terminal Match**: Segment end stations match reference terminals.
2. **Station Count Match**: Compiled operational stations match reference.
3. **Consecutive Gap <= 5 km**: Flag any gap between adjacent stations exceeding 5 km.
4. **Projection Offset <= 150 m**: Flag stations perpendicular distance > 150 m from line polyline.
5. **Sequence & Duplicates**: Monotonic ascending sequence along segment without duplicate IDs.

### 3.GURUGRAM: Gurugram

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `gur-rapid` | Rapid Metro | linear | 11 / 11 | 1.58 km | 9 m | ❌ No | ❌ Fail | Missing reference terminal(s) at segment ends: Cyber City |

### 3.NAVI-MUMBAI: Navi Mumbai

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `nmm-line-1` | Line 1 | linear | 11 / 11 | 1.24 km | 0 m | ✅ Yes | ✅ Pass | None |

### 3.CHENNAI: Chennai

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `che-blue` | Blue Line (Corridor 1) | linear | 26 / 26 | 2.33 km | 16 m | ✅ Yes | ✅ Pass | None |
| `che-green` | Green Line (Corridor 2) | linear | 17 / 17 | 2.16 km | 23 m | ✅ Yes | ✅ Pass | None |

### 3.PUNE: Pune

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `pun-purple` | Purple Line (Line 1) | linear | 13 / 13 | 3.44 km | 14 m | ✅ Yes | ✅ Pass | None |
| `pun-aqua` | Aqua Line (Line 2) | linear | 16 / 16 | 2.01 km | 7 m | ✅ Yes | ✅ Pass | None |

### 3.BENGALURU: Bengaluru

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `blr-purple` | Purple Line | linear | 37 / 37 | 2.03 km | 8 m | ✅ Yes | ✅ Pass | None |
| `blr-green` | Green Line | linear | 32 / 32 | 1.73 km | 9 m | ✅ Yes | ✅ Pass | None |
| `blr-yellow` | Yellow Line | linear | 16 / 16 | 1.57 km | 5 m | ✅ Yes | ✅ Pass | None |

### 3.MUMBAI: Mumbai

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `mum-line-1` | Line 1 (Blue) | linear | 12 / 12 | 1.34 km | 6 m | ✅ Yes | ✅ Pass | None |
| `mum-line-2a` | Line 2A (Yellow) | linear | 17 / 17 | 1.67 km | 9 m | ✅ Yes | ✅ Pass | None |
| `mum-line-7` | Line 7 (Red) | linear | 14 / 14 | 1.92 km | 0 m | ✅ Yes | ✅ Pass | None |
| `mum-line-3` | Line 3 (Aqua) | linear | 27 / 27 | 1.78 km | 148 m | ✅ Yes | ✅ Pass | None |
| `mum-line-2b` | Line 2B (Yellow Ext) | linear | 6 / 6 | 1.51 km | 2 m | ✅ Yes | ✅ Pass | None |
| `mum-line-9` | Line 9 (Red Line Ext) | linear | 4 / 4 | 1.48 km | 0 m | ✅ Yes | ✅ Pass | None |

**Connected Components (2 disjoint groups):**
- **Component 1** (71 stations, lines: `mum-line-1, mum-line-7, mum-line-2a, mum-line-3, mum-line-9`): Andheri, Azad Nagar, Western Express Highway, D. N. Nagar, Chakala - J.B. Nagar ... (+66 more)
- **Component 2** (6 stations, lines: `mum-line-2b`): Chembur, Diamond Garden, Shivaji Chowk (Chembur), Deonar, Mankhurd ... (+1 more)

### 3.KOLKATA: Kolkata

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `kol-blue` | Blue Line (Line 1) | linear | 26 / 26 | 2.1 km | 10 m | ✅ Yes | ✅ Pass | None |
| `kol-green` | Green Line (Line 2) | linear | 12 / 12 | 2.19 km | 12 m | ✅ Yes | ✅ Pass | None |
| `kol-purple` | Purple Line (Line 3) | linear | 7 / 7 | 1.46 km | 6 m | ✅ Yes | ✅ Pass | None |
| `kol-yellow` | Yellow Line (Line 4) | linear | 4 / 4 | 1.87 km | 0 m | ✅ Yes | ✅ Pass | None |
| `kol-orange` | Orange Line (Line 6) | linear | 9 / 9 | 1.49 km | 7 m | ✅ Yes | ✅ Pass | None |

**Connected Components (2 disjoint groups):**
- **Component 2** (48 stations, lines: `kol-orange, kol-blue, kol-green, kol-yellow`): Jyotirindra Nandi, Satyajit Roy, Kavi Sukanta, Kavi Subhash, Hemanta Mukhopadhyay ... (+43 more)
- **Component 1** (7 stations, lines: `kol-purple`): Majerhat, Taratala, Behala Bazar, Behala Chowrasta, Sakher Bazar ... (+2 more)

### 3.HYDERABAD: Hyderabad

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `hyd-red` | Red Line (Corridor I) | linear | 27 / 27 | 1.7 km | 22 m | ✅ Yes | ✅ Pass | None |
| `hyd-blue` | Blue Line (Corridor III) | linear | 23 / 23 | 1.57 km | 5 m | ✅ Yes | ✅ Pass | None |
| `hyd-green` | Green Line (Corridor II) | linear | 9 / 9 | 1.7 km | 6 m | ✅ Yes | ✅ Pass | None |

### 3.AHMEDABAD: Ahmedabad

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ahm-blue` | Blue Line (Line 1 / East-West Corridor) | linear | 18 / 18 | 1.73 km | 13 m | ✅ Yes | ✅ Pass | None |
| `ahm-red` | Red Line (Line 2 / North-South Corridor) | linear | 14 / 14 | 2.12 km | 21 m | ✅ Yes | ✅ Pass | None |
| `ahm-yellow` | Yellow Line (Line 3 / Motera Stadium - Mahatma Mandir) | linear | 21 / 21 | 1.45 km | 7 m | ✅ Yes | ✅ Pass | None |
| `ahm-violet` | Violet Line (Line 4 / GNLU - GIFT City Spur) | linear | 3 / 3 | 2.5 km | 4 m | ✅ Yes | ✅ Pass | None |

### 3.NOIDA: Noida

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `noi-aqua` | Aqua Line | linear | 21 / 21 | 2.53 km | 6 m | ✅ Yes | ✅ Pass | None |

### 3.DELHI: Delhi

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `del-red` | Red Line | linear | 29 / 29 | 2.18 km | 8 m | ✅ Yes | ✅ Pass | None |
| `del-yellow` | Yellow Line | linear | 37 / 37 | 2.71 km | 81 m | ✅ Yes | ✅ Pass | None |
| `del-blue` | Blue Line | branched | 57 / 57 | 1.82 km | 13 m | ✅ Yes | ✅ Pass | None |
| `del-green` | Green Line | branched | 24 / 24 | 2.05 km | 154 m | ✅ Yes | ❌ Fail | 1 station(s) projecting > 150 m from track (e.g. Punjabi Bagh West: 154 m) |
| `del-violet` | Violet Line | linear | 34 / 34 | 2.26 km | 20 m | ✅ Yes | ✅ Pass | None |
| `del-airport` | Airport Express | linear | 7 / 7 | 6.36 km | 25 m | ✅ Yes | ❌ Fail | Consecutive station gap > 5 km: 6.36 km (Dhaula Kuan to Shivaji Stadium) |
| `del-pink` | Pink Line | linear | 38 / 38 | 3.56 km | 229 m | ✅ Yes | ❌ Fail | 3 station(s) projecting > 150 m from track (e.g. Rajouri Garden: 229 m) |
| `del-magenta` | Magenta Line | linear | 25 / 25 | 3.04 km | 212 m | ✅ Yes | ❌ Fail | 1 station(s) projecting > 150 m from track (e.g. Kalkaji Mandir: 212 m) |
| `del-grey` | Grey Line | linear | 4 / 4 | 2.39 km | 0 m | ✅ Yes | ✅ Pass | None |

### 3.INDORE: Indore

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ind-yellow` | Yellow Line (Line 3) | loop | 16 / 16 | 1.49 km | 18 m | ✅ Yes | ✅ Pass | None |

### 3.BHOPAL: Bhopal

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bho-orange` | Orange Line (Line 2) | linear | 8 / 8 | 0.9 km | 0 m | ❌ No | ❌ Fail | Missing reference terminal(s) at segment ends: Karond Circle |

### 3.NAGPUR: Nagpur

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `nag-orange` | Orange Line (Line 1) | linear | 18 / 18 | 2.03 km | 20 m | ✅ Yes | ✅ Pass | None |
| `nag-aqua` | Aqua Line (Line 2) | linear | 20 / 20 | 1.33 km | 19 m | ✅ Yes | ✅ Pass | None |

### 3.KOCHI: Kochi

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `koc-blue` | Line 1 (Blue Line) | linear | 25 / 25 | 2.02 km | 58 m | ✅ Yes | ✅ Pass | None |

### 3.LUCKNOW: Lucknow

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `lko-red` | Red Line (North-South Corridor) | linear | 21 / 21 | 2.08 km | 0 m | ✅ Yes | ✅ Pass | None |

### 3.KANPUR: Kanpur

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `knp-orange` | Orange Line | linear | 14 / 14 | 1.92 km | 0 m | ✅ Yes | ✅ Pass | None |

### 3.AGRA: Agra

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `agr-yellow` | Yellow Line | linear | 6 / 6 | 1.53 km | 0 m | ✅ Yes | ✅ Pass | None |

### 3.JAIPUR: Jaipur

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `jai-pink` | Pink Line | linear | 11 / 11 | 1.42 km | 0 m | ✅ Yes | ✅ Pass | None |

### 3.PATNA: Patna

| Line ID | Line Name | Topology | Stations (Comp / Ref) | Max Gap | Max Proj | Terminals Match | Pass / Fail | Failure Details |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `pat-blue` | Blue Line (Corridor 2) | linear | 5 / 5 | 1.32 km | 12 m | ✅ Yes | ✅ Pass | None |

---

## 4. Detailed Defect Analysis & Guard Strategy

### 4.1 Pending-Rule Defect Cities (Parked Issues)
- **Bhopal (`bhopal`)**: Under active audit review PRE-01 (operational length discrepancy >10%).
- **Gurugram (`gurugram`)**: Under active audit review PRE-02 (Rapid Metro loop terminal Cyber City geometry offset 1904 m).
- **Surat (`surat`)**: 0 operational stations (entire network under construction).

### 4.2 Consecutive Station Gaps > 5 km
- **Delhi - Airport Express** (`del-airport`): 6.36 km between Dhaula Kuan and Shivaji Stadium

### 4.3 Station Projection Offsets > 150 m
- **Delhi - Green Line** (`del-green`): Punjabi Bagh West (154 m)
- **Delhi - Pink Line** (`del-pink`): Rajouri Garden (229 m), Netaji Subhash Place (209 m), Azadpur (206 m)
- **Delhi - Magenta Line** (`del-magenta`): Kalkaji Mandir (212 m)

---

## 5. Tier 1 Cities Sample Routes Verification

Sample routes across all Tier 1 cities (3 routes each) demonstrating multi-transfer routes, branched routes, and linear trips:

| City | Route # | Origin | Destination | Stops | Transfers | Estimated Time | Traversed Lines |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DELHI** | #1 | Dwarka Sector 12 | Yashobhoomi Dwarka Sector 25 | 6 | 1 | 20 min | Blue Line ➔ Airport Express |
| **DELHI** | #2 | Dwarka Sector 12 | Shaheed Sthal | 39 | 2 | 111 min | Blue Line ➔ Green Line ➔ Red Line |
| **DELHI** | #3 | Dwarka Sector 12 | Najafgarh | 5 | 1 | 19 min | Blue Line ➔ Grey Line |
| **MUMBAI** | #1 | Andheri | Aarey JVLR | 7 | 1 | 21 min | Line 1 (Blue) ➔ Line 3 (Aqua) |
| **MUMBAI** | #2 | Andheri | Sahar Road | 6 | 1 | 17 min | Line 1 (Blue) ➔ Line 3 (Aqua) |
| **MUMBAI** | #3 | Andheri | CSMIA Domestic | 7 | 1 | 21 min | Line 1 (Blue) ➔ Line 3 (Aqua) |
| **BENGALURU** | #1 | Trinity | Biocon Hebbagodi | 26 | 2 | 73 min | Purple Line ➔ Green Line ➔ Yellow Line |
| **BENGALURU** | #2 | Trinity | Kadugodi Tree Park | 15 | 0 | 39 min | Purple Line |
| **BENGALURU** | #3 | Trinity | Challaghatta | 19 | 0 | 50 min | Purple Line |
| **CHENNAI** | #1 | Mannadi | Wimco Nagar Depot | 10 | 0 | 25 min | Blue Line (Corridor 1) |
| **CHENNAI** | #2 | Mannadi | Anna Nagar Tower | 9 | 1 | 27 min | Blue Line (Corridor 1) ➔ Green Line (Corridor 2) |
| **CHENNAI** | #3 | Mannadi | Thirumangalam | 10 | 1 | 29 min | Blue Line (Corridor 1) ➔ Green Line (Corridor 2) |
| **HYDERABAD** | #1 | Secunderabad West | Gandhi Hospital | 1 | 0 | 2 min | Green Line (Corridor II) |
| **HYDERABAD** | #2 | Secunderabad West | Musheerabad | 2 | 0 | 4 min | Green Line (Corridor II) |
| **HYDERABAD** | #3 | Secunderabad West | Chikkadpally | 4 | 0 | 9 min | Green Line (Corridor II) |
| **KOLKATA** | #1 | Majerhat | Joka | 6 | 0 | 18 min | Purple Line (Line 3) |
| **KOLKATA** | #2 | Majerhat | Taratala | 1 | 0 | 3 min | Purple Line (Line 3) |
| **KOLKATA** | #3 | Majerhat | Sakher Bazar | 4 | 0 | 12 min | Purple Line (Line 3) |

---
*Generated automatically by scripts/verify-routing.ts on 2026-10-17*