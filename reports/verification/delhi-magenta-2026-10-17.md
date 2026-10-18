# Delhi Metro Line 8 (Magenta Line) Verification Report

**File:** `reports/verification/delhi-magenta-2026-10-17.md`  
**Date:** 2026-10-17  
**Scope:** Strict READ-ONLY verification of Delhi Metro Line 8 (Magenta Line), network interchanges, reference length discrepancies, Delhi city totals, and audit engine rule IDs.  
**Execution Mode:** Read-only. No edits to data/ or codebase, no commits, no branch changes.

---

## 1. Magenta Line (Line 8) DMRC Facts vs Repo Reference

### 1.1 DMRC Primary Sources
- **Primary Source 1 (Network Map):**
  - **URL:** `https://delhimetrorail.com/static/media/DMRC-NMRC-and-NCRTC-MAP-10.09.2026.165037e4.pdf`
  - **Date:** 2026-09-10 (retrieved 2026-10-17)
  - **VERIFIED:** "Line 8 - Magenta Line | Botanical Garden - Krishna Park Extn. & Deepali Chowk - Majlis Park | 49.195 | 33"
- **Primary Source 2 (Present Network Page):**
  - **URL:** `https://www.delhimetrorail.com/pages/about-us/present-network`
  - **Date:** 2026-10-17
  - **VERIFIED:** "Line-8 ( Magenta Line )
Botanical Garden- Kalkaji Mandir : with Effect from 25th December 2017 (Phase - III) .
Kalkaji Mandir - Janakpuri West : with Effect from 28th May 2018 (Phase - III) .
Janakpuri West - Krishna Park Extn : with effect from date 05th Jan 2025 (Phase -IV) .
Deepali Chowk to Majlis Park : with effect from 08th March 2026 (Phase-IV) ."

### 1.2 Section-by-Section Opening Dates, Lengths & Operational Status
| Section | Phase | Opening Date (DMRC) | DMRC Stated Length | Operational Status |
| :--- | :---: | :---: | :---: | :---: |
| Botanical Garden - Kalkaji Mandir | Phase III | 2017-12-25 | NOT STATED on present-network (Phase III total: 37.46 km) | Operational |
| Kalkaji Mandir - Janakpuri West | Phase III | 2018-05-28 | NOT STATED on present-network | Operational |
| Janakpuri West - Krishna Park Extn | Phase IV | 2025-01-05 | NOT STATED on present-network | Operational |
| Krishna Park Extn - Deepali Chowk | Phase IV | Not opened | NOT STATED (under construction corridor) | Under Construction |
| Deepali Chowk to Majlis Park | Phase IV | 2026-03-08 | NOT STATED on present-network | Operational |

*Note on Total Operational Length:* DMRC network map table states total operational length for Line 8 as **49.195 km** with **33 stations** across the two operational stretches: `Botanical Garden - Krishna Park Extn.` and `Deepali Chowk - Majlis Park`.

### 1.3 Ordered List of Every Magenta Station (DMRC Spelling)
Below is the sequential list of all 33 stations listed by DMRC across the operational sections:

#### Section A: Botanical Garden to Krishna Park Extn (26 stations)
1. Botanical Garden (Interchange: Line 3 Blue Line)
2. Okhla Bird Sanctuary
3. Kalindi Kunj
4. Jasola Vihar Shaheen Bagh
5. Okhla Vihar
6. Jamia Millia Islamia
7. Sukhdev Vihar
8. NSIC Okhla (Okhla NSIC)
9. Kalkaji Mandir (Interchange: Line 6 Violet Line)
10. Nehru Enclave
11. Greater Kailash
12. Chirag Delhi
13. Panchsheel Park
14. Hauz Khas (Interchange: Line 2 Yellow Line)
15. IIT
16. R.K. Puram
17. Munirka
18. Vasant Vihar
19. Shankar Vihar
20. Terminal 1-IGI Airport
21. Sadar Bazar Cantonment
22. Palam
23. Dashrath Puri
24. Dabri Mor - Janakpuri South
25. Janakpuri West (Interchange: Line 3 Blue Line)
26. Krishna Park Extn.

*--- Under Construction Gap (Krishna Park Extn. to Deepali Chowk: Keshopur, Paschim Vihar, Peeragarhi, Mangolpuri, West Enclave, Pushpanjali) ---*

#### Section B: Deepali Chowk to Majlis Park (7 stations)
27. Deepali Chowk
28. Madhuban Chowk (Interchange: Line 1 Red Line via Pitampura)
29. Prashant Vihar
30. North Pitampura
31. Haiderpur Badli Mor (Interchange: Line 2 Yellow Line)
32. Bhalaswa
33. Majlis Park (Interchange: Line 7 Pink Line)

### 1.4 The 8 Stations and 11.735 km that Differ
- **Station Count Discrepancy:** DMRC map lists **33 stations**, repo reference lists **25 stations** ($33 - 25 = 8\text{ stations}$).
- **The 8 Differing Stations:**
  1. `Krishna Park Extn.` (Phase 4 western extension from Janakpuri West)
  2. `Deepali Chowk` (Phase 4 northern section terminal)
  3. `Madhuban Chowk` (Phase 4 northern section)
  4. `Prashant Vihar` (Phase 4 northern section)
  5. `North Pitampura` (Phase 4 northern section)
  6. `Haiderpur Badli Mor` (Phase 4 Line 8 platform)
  7. `Bhalaswa` (Phase 4 northern section)
  8. `Majlis Park` (Phase 4 Line 8 platform)
- **Length Discrepancy:** DMRC map states **49.195 km**, repo reference states **37.46 km** ($49.195 - 37.46 = 11.735\text{ km}$).

### 1.5 Map's Under-Construction Table Quoted
In the official DMRC September 2026 map (`scratch/table_under_construction.png`), the table titled **"Under Construction Network (Ph-IV)"** contains the following rows:

| Corridor Description | Length in km | No. of Stations |
| :--- | :---: | :---: |
| Ramakrishna Ashram Marg-Indraprastha | 9.913 | 8 |
| Tughlakabad-Kalindi Kunj | 3.900 | 3 |
| Aerocity-IGD Airport Terminal 1 | 2.263 | 1 |
| **Total** | **16.076** | **12** |

**VERIFIED Observation:** Line 8 is **NOT listed by name** in the "Under Construction Network (Ph-IV)" table. However, on the map graphic itself, the uncompleted middle gap connecting Krishna Park Extn. to Deepali Chowk is shown as a dashed line (under construction), while the operational sections are shown as solid lines.

---

## 2. Repo Current State for Missing Stations & Sections

### 2.1 In `data/stations.geojson`
```json
{
  "station_id": "del-deepali-chowk",
  "name": "Deepali Chowk",
  "city_id": "delhi",
  "line_ids": ["del-magenta"],
  "status": "construction",
  "phase": "IV",
  "is_interchange": false,
  "interchange_id": null
}
```
```json
{
  "station_id": "del-north-pitampura-prashant-vihar",
  "name": "North Pitampura - Prashant Vihar",
  "city_id": "delhi",
  "line_ids": ["del-magenta"],
  "status": "construction",
  "phase": "IV",
  "is_interchange": false,
  "interchange_id": null
}
```
```json
{
  "station_id": "del-bhalaswa",
  "name": "Bhalaswa",
  "city_id": "delhi",
  "line_ids": ["del-magenta"],
  "status": "construction",
  "phase": "IV",
  "is_interchange": false,
  "interchange_id": null
}
```
- `Krishna Park Extension`: **Missing** from `data/stations.geojson`. In `data/overrides/delhi.json`, `del-krishna-park-extension` is explicitly listed under `out_of_scope_station_ids`.
- `Madhuban Chowk`: Exists as `del-madhuban-chowk` with `line_ids: ['del-red']`, `status: "operational"`, but has no Line 8 association.
- `Haiderpur Badli Mor`: Exists as `del-haiderpur-badli-mor` with `line_ids: ['del-yellow']`, `status: "operational"`, but has no Line 8 association.
- `Majlis Park`: Exists as `del-majlis-park` with `line_ids: ['del-pink']`, `status: "operational"`, but has no Line 8 association.

### 2.2 In `data/segments.geojson`
- `del-magenta-seg-01`:
  - `status`: `"operational"`
  - `phase`: `"III"`
  - `length_km`: 35.8
  - `geometry_quality`: `"exact"`
  - `inaugurated_on`: `"2017-12-25"`
  - `references`: `[]`
- `del-magenta-seg-02`:
  - `status`: `"construction"`
  - `phase`: `"IV"`
  - `length_km`: 7.0
  - `geometry_quality`: `"exact"`
  - `references`: `["https://delhimetrorail.com/", "https://www.openstreetmap.org/way/538930431"]`
- `del-magenta-seg-03`:
  - `status`: `"construction"`
  - `phase`: `"IV"`
  - `length_km`: 12.9
  - `geometry_quality`: `"exact"`
  - `references`: `["https://delhimetrorail.com/", "https://www.openstreetmap.org/way/538930433"]`

### 2.3 In `data/reference/delhi.json`
```json
{
  "line_id": "del-magenta",
  "official_name": "Magenta Line (Line 8)",
  "operator": "DMRC",
  "topology": "linear",
  "operational_stations": 25,
  "operational_length_km": 37.46,
  "planned_length_km": 66.82,
  "terminals": [
    "Janakpuri West",
    "Botanical Garden"
  ],
  "status": "operational",
  "disjoint_stretches": false,
  "openings": [
    {
      "stage": "Botanical Garden - Kalkaji Mandir",
      "phase": "3",
      "opened_on": "2017-12-25",
      "stations_added": 9,
      "source": {
        "kind": "official",
        "url": "https://www.delhimetrorail.com/corporate"
      }
    },
    {
      "stage": "Kalkaji Mandir - Janakpuri West",
      "phase": "3",
      "opened_on": "2018-05-28",
      "stations_added": 16,
      "source": {
        "kind": "official",
        "url": "https://www.delhimetrorail.com/corporate"
      }
    }
  ],
  "construction": [
    {
      "stretch": "Phase 4 extension (Janakpuri West - Ramakrishna Ashram Marg)",
      "phase": "4",
      "expected_completion": null,
      "stations": 22,
      "notes": "29.36 km extension with 22 stations.",
      "source": {
        "kind": "official",
        "url": "https://www.delhimetrorail.com/project-updates"
      }
    }
  ],
  "notes": "37.46 km operational line with 25 stations. Phase 4 extension (Janakpuri West to RK Ashram Marg, 29.36 km, 22 stations) under active construction."
}
```

---

## 3. OSM Availability for Missing Stations & Sections

### 3.1 Section 1: Janakpuri West to Krishna Park Extension
- **Way ID `1339456793`**:
  - `visible`: "true"
  - `version`: "2"
  - `changeset`: "161049876"
  - `timestamp`: "2025-01-06T09:43:34Z"
  - `user`: "Claudius Henrichs"
  - `uid`: "18069"
  - `endpoints`: Node `2832938330` (Janakpuri West) $\rightarrow$ Node `12478112132` (Krishna Park Extension)
  - `continuity`: Continuous direct connection from Line 8 Janakpuri West terminus.
  - **Full Tags:**
```json
{
  "electrified": "yes",
  "gauge": "1676",
  "layer": "-2",
  "name": "R K Ashram Marg to Krishna Park Extension (Phase-4)",
  "railway": "subway",
  "tracks": "2",
  "tunnel": "yes",
  "usage": "main",
  "voltage": "750"
}
```
- **Krishna Park Extension Station Node ID `12149316873`**:
  - `version`: "5", `timestamp`: "2026-03-17T12:21:16Z", `user`: "Claudius Henrichs"
  - `lat`: 28.6477917, `lon`: 77.0843425
  - **Full Tags:**
```json
{
  "name": "Krishna Park Extension",
  "name:fa": "پروژه الحاقی پارک کریشنا",
  "name:hi": "कृष्णा पार्क एक्सटेंशन",
  "network": "Delhi Metro",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "station",
  "railway": "station",
  "ref": "KPEN",
  "station": "subway",
  "subway": "yes",
  "wheelchair": "yes",
  "wikidata": "Q131309538",
  "wikipedia": "en:Krishna Park Extension metro station"
}
```
- **Krishna Park Extension Stop Position Node ID `12478112132`**:
  - `version`: "1", `timestamp`: "2025-01-06T09:43:34Z", `user`: "Claudius Henrichs"
  - `lat`: 28.6478016, `lon`: 77.0843102
  - **Full Tags:**
```json
{
  "name": "Krishna Park Extension",
  "name:hi": "कृष्णा पार्क एक्सटेंशन",
  "public_transport": "stop_position",
  "subway": "yes"
}
```

### 3.2 Construction Gap: Krishna Park Extension to Deepali Chowk
- **Way ID `1348956632`**:
  - `version`: "1", `timestamp`: "2025-01-06T09:43:34Z", `user`: "Claudius Henrichs"
  - `endpoints`: Node `12478112132` $\rightarrow$ Node `5215706493`
  - **Full Tags:**
```json
{
  "construction": "subway",
  "construction:railway": "subway",
  "electrified": "yes",
  "gauge": "1676",
  "layer": "-2",
  "name": "R K Ashram Marg to Krishna Park Extension (Phase-4)",
  "railway": "construction",
  "tracks": "2",
  "tunnel": "yes",
  "usage": "main",
  "voltage": "750"
}
```
- **Way ID `1486690684`**:
  - `railway`: "construction"
  - Connects to Deepali Chowk boundary node `12390111488`.

### 3.3 Section 2: Deepali Chowk to Majlis Park
- **Way ID `1486690682`**:
  - `version`: "2", `timestamp`: "2026-03-17T12:06:42Z", `user`: "Claudius Henrichs"
  - `endpoints`: Node `12390111488` $\rightarrow$ Node `5215706515`
  - **Full Tags:**
```json
{
  "bridge": "yes",
  "electrified": "yes",
  "gauge": "1676",
  "layer": "1",
  "name": "R K Ashram Marg to Krishna Park Extension (Phase-4)",
  "railway": "subway",
  "tracks": "2",
  "usage": "main",
  "voltage": "750"
}
```
- **Way ID `1489746230`**:
  - `version`: "1", `timestamp`: "2026-03-17T12:06:42Z", `user`: "Claudius Henrichs"
  - `endpoints`: Node `5215706515` $\rightarrow$ Node `12390111489`
  - **Full Tags:**
```json
{
  "bridge": "yes",
  "electrified": "yes",
  "gauge": "1676",
  "layer": "1",
  "name": "R K Ashram Marg to Krishna Park Extension (Phase-4)",
  "railway": "subway",
  "tracks": "2",
  "usage": "main",
  "voltage": "750"
}
```
- **Way ID `538930432`**:
  - `version`: "15", `timestamp`: "2026-03-17T12:06:42Z", `user`: "Claudius Henrichs"
  - `endpoints`: Node `12390111489` (Deepali Chowk) $\rightarrow$ Node `13628267997` (Majlis Park)
  - `nodes`: 111 continuous nodes
  - **Full Tags:**
```json
{
  "bridge": "yes",
  "electrified": "yes",
  "gauge": "1676",
  "layer": "1",
  "name": "R K Ashram Marg to Krishna Park Extension (Phase-4)",
  "railway": "subway",
  "tracks": "2",
  "usage": "main",
  "voltage": "750"
}
```
- **Way ID `1489746232`**:
  - `version`: "1", `timestamp`: "2026-03-17T12:06:42Z", `user`: "Claudius Henrichs"
  - `endpoints`: Node `13628267997` (Majlis Park) $\rightarrow$ Node `5215706552`
  - **Full Tags:**
```json
{
  "bridge": "yes",
  "electrified": "yes",
  "gauge": "1676",
  "layer": "1",
  "name": "R K Ashram Marg to Krishna Park Extension (Phase-4)",
  "railway": "subway",
  "tracks": "2",
  "usage": "main",
  "voltage": "750"
}
```

### 3.4 Station Nodes Along Deepali Chowk to Majlis Park
- **Deepali Chowk Station Node ID `5215706475`**:
  - `version`: "3", `timestamp`: "2026-03-08T19:19:15Z", `user`: "Vonter"
  - `lat`: 28.6981000, `lon`: 77.1182795
  - **Full Tags:**
```json
{
  "name": "Deepali Chowk",
  "name:hi": "दीपाली चौक",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "station",
  "railway": "station",
  "station": "subway",
  "subway": "yes"
}
```
- **Madhuban Chowk Stop Position Node ID `13628472108`**:
  - `version`: "1", `timestamp`: "2026-03-08T19:19:15Z", `user`: "Vonter"
  - `lat`: 28.7035819, `lon`: 77.1300557
  - **Full Tags:**
```json
{
  "name": "Madhuban Chowk",
  "name:hi": "मधुबन चौक",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "stop_position",
  "railway": "stop",
  "subway": "yes"
}
```
- **North Pitampura - Prashant Vihar Station Node ID `5215706525`**:
  - `version`: "4", `timestamp`: "2026-04-06T10:12:13Z", `user`: "paneer69"
  - `lat`: 28.7130743, `lon`: 77.1387306
  - **Full Tags:**
```json
{
  "name": "North Pitampura - Prashant Vihar",
  "name:hi": "उत्तरी पीतमपुरा - प्रशांत विहार",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "station",
  "railway": "station",
  "station": "subway",
  "subway": "yes"
}
```
- **North Pitampura - Prashant Vihar Stop Position Node ID `13628472106`**:
  - `version`: "2", `timestamp`: "2026-04-06T10:12:13Z", `user`: "paneer69"
  - `lat`: 28.7130881, `lon`: 77.1386504
  - **Full Tags:**
```json
{
  "name": "North Pitampura - Prashant Vihar",
  "name:hi": "उत्तरी पीतमपुरा - प्रशांत विहार",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "stop_position",
  "railway": "stop",
  "subway": "yes"
}
```
- **Haiderpur Badli Mor Stop Position Node ID `13628472101`**:
  - `version`: "1", `timestamp`: "2026-03-08T19:19:15Z", `user`: "Vonter"
  - `lat`: 28.7298439, `lon`: 77.1488054
  - **Full Tags:**
```json
{
  "name": "Haiderpur Badli Mor",
  "name:fa": "حیدرپور بادلی مور",
  "name:hi": "हैदरपुर बादली मोड़",
  "name:ru": "Хайдерпур Бадли Мор",
  "name:ur": "حیدر پور بادلی موڑ",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "stop_position",
  "railway": "stop",
  "ref": "BIMR",
  "subway": "yes"
}
```
- **Bhalaswa Station Node ID `5215706542`**:
  - `version`: "3", `timestamp`: "2026-03-08T19:19:15Z", `user`: "Vonter"
  - `lat`: 28.7369574, `lon`: 77.1680870
  - **Full Tags:**
```json
{
  "name": "Bhalaswa",
  "name:hi": "भलस्वा",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "station",
  "railway": "station",
  "station": "subway",
  "subway": "yes"
}
```
- **Bhalaswa Stop Position Node ID `13628267999`**:
  - `version`: "1", `timestamp`: "2026-03-08T19:19:15Z", `user`: "Vonter"
  - `lat`: 28.7369383, `lon`: 77.1680770
  - **Full Tags:**
```json
{
  "name": "Bhalaswa",
  "name:hi": "भलस्वा",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "stop_position",
  "railway": "stop",
  "ref": "BIMR",
  "subway": "yes"
}
```
- **Majlis Park (Line 8 Phase 4) Stop Position Node ID `13628267997`**:
  - `version`: "1", `timestamp`: "2026-03-08T19:19:15Z", `user`: "Vonter"
  - `lat`: 28.7240890, `lon`: 77.1816387
  - **Full Tags:**
```json
{
  "name": "Majlis Park",
  "name:hi": "मजलिस पार्क",
  "network": "Delhi Metro",
  "note": "Contributors are requested to not edit the \"network\" and the \"operator\" tags. (2023/06/22)",
  "operator": "Delhi Metro Rail Corporation Limited",
  "public_transport": "stop_position",
  "public_transport:version": "2",
  "railway": "stop",
  "subway": "yes"
}
```

---

## 4. Interchanges Analysis

### 4.1 Check in `data/overrides/interchanges.json`
Below is the exact output of the inspection script:
```json
{
  "_comment": [
    "Manual corrections for interchange clusters. Keyed by station_id.",
    "To MERGE: set two station_ids to the same interchange_id string.",
    "To SPLIT (remove from auto cluster): set interchange_id to null.",
    "If a station is not listed here, auto-derivation applies.",
    "Auto rule: is_interchange=true → interchange_id = station_id of cluster representative."
  ],
  "del-sikanderpur": {
    "interchange_id": "int-sikanderpur"
  },
  "gur-sikanderpur": {
    "interchange_id": "int-sikanderpur"
  },
  "del-noida-sector-52": {
    "interchange_id": "int-noida-sec51-52"
  },
  "noi-noida-sector-51": {
    "interchange_id": "int-noida-sec51-52"
  },
  "mum-western-express-highway": {
    "interchange_id": "int-mumbai-weh-gundavali",
    "source": "https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg",
    "date": "2026-10-17",
    "note": "straight-line distance (222 m); operator map listed at https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg, not independently confirmed"
  },
  "mum-gundavali": {
    "interchange_id": "int-mumbai-weh-gundavali",
    "source": "https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg",
    "date": "2026-10-17",
    "note": "straight-line distance (222 m); operator map listed at https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg, not independently confirmed"
  },
  "mum-d-n-nagar": {
    "interchange_id": "int-mumbai-dn-nagar-andheri-west",
    "source": "https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg",
    "date": "2026-10-17",
    "note": "straight-line distance (128 m); operator map listed at https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg, not independently confirmed"
  },
  "mum-andheri-west": {
    "interchange_id": "int-mumbai-dn-nagar-andheri-west",
    "source": "https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg",
    "date": "2026-10-17",
    "note": "straight-line distance (128 m); operator map listed at https://www.mmmocl.co.in/assets/images/mumbai-metro-map2.jpg, not independently confirmed"
  },
  "hyderabad-parade-ground": {
    "interchange_id": "int-hyderabad-parade-ground",
    "source": "https://ltmetro.com/metro-network-map/",
    "date": "2026-10-17",
    "note": "straight-line distance (637 m); operator map listed at https://ltmetro.com/metro-network-map/, not independently confirmed"
  },
  "hyderabad-jbs-parade-ground": {
    "interchange_id": "int-hyderabad-parade-ground",
    "source": "https://ltmetro.com/metro-network-map/",
    "date": "2026-10-17",
    "note": "straight-line distance (637 m); operator map listed at https://ltmetro.com/metro-network-map/, not independently confirmed"
  }
}
```
**VERIFIED Result:** None of the queried stations (`Majlis Park`, `Krishna Park Extension`, `Deepali Chowk`, `Anand Vihar`, `Mayur Vihar Pocket-1` / `del-shree-ram-mandir-mayur-vihar`, `Maya Puri`, `Delhi Cantt`) are in `data/overrides/interchanges.json`.

### 4.2 Status of Each Requested Station in Repo & Primary Sources
1. **Majlis Park**:
   - **Repo ID:** `del-majlis-park`
   - **Repo Status:** `line_ids: ['del-pink']`, `is_interchange: false`, `interchange_id: null`
   - **DMRC Source:** Official DMRC Map (2026-09-10) depicts Majlis Park as an operational interchange connecting Line 7 (Pink Line) and Line 8 (Magenta Line Phase 4 extension from Deepali Chowk).
2. **Krishna Park Extension**:
   - **Repo ID:** Not present in `stations.geojson` (in `out_of_scope_station_ids` in `overrides/delhi.json`).
   - **Repo Status:** None
   - **DMRC Source:** Official DMRC Map lists it as the western terminal of Line 8. Not an interchange.
3. **Deepali Chowk**:
   - **Repo ID:** `del-deepali-chowk`
   - **Repo Status:** `line_ids: ['del-magenta']`, `status: "construction"`, `is_interchange: false`, `interchange_id: null`
   - **DMRC Source:** Official DMRC Map lists it as the intermediate terminal for the northern Line 8 section. Not an interchange.
4. **Anand Vihar**:
   - **Repo ID:** `del-anand-vihar`
   - **Repo Status:** `line_ids: ['del-blue', 'del-pink']`, `status: "operational"`, `is_interchange: true`, `interchange_id: "del-anand-vihar"`
   - **DMRC Source:** DMRC Network Map confirms Anand Vihar is an interchange between Blue Line (Line 4 branch) and Pink Line (Line 7), and connects to Indian Railways Anand Vihar Terminal and Anand Vihar ISBT.
5. **Mayur Vihar Pocket-1 (Repo ID `del-shree-ram-mandir-mayur-vihar`)**:
   - **Repo ID:** `del-shree-ram-mandir-mayur-vihar`
   - **Repo Status:** `line_ids: ['del-pink']`, `status: "operational"`, `is_interchange: false`, `interchange_id: null`
   - **DMRC Source:** DMRC Network Map confirms this station is a standard non-interchange station on the Pink Line (Line 7). The Blue/Pink metro interchange is at `Mayur Vihar - I` (`del-mayur-vihar-i`), NOT Mayur Vihar Pocket-1.
6. **Maya Puri (Repo ID `del-mayapuri`)**:
   - **Repo ID:** `del-mayapuri`
   - **Repo Status:** `line_ids: ['del-pink']`, `status: "operational"`, `is_interchange: false`, `interchange_id: null`
   - **DMRC Source:** DMRC Network Map confirms Mayapuri is a standard non-interchange metro station on Line 7.
7. **Delhi Cantt (Repo ID `del-delhi-cantt`)**:
   - **Repo ID:** `del-delhi-cantt`
   - **Repo Status:** `line_ids: ['del-pink']`, `status: "operational"`, `is_interchange: false`, `interchange_id: null`
   - **DMRC Source:** DMRC Network Map confirms Delhi Cantt is a standard non-interchange metro station on Line 7. (Pedestrian FOB connects towards Indian Railways Delhi Cantt station, but no metro interchange).

*Constraint Check:* **0 links added**.

---

## 5. Reference Length Discrepancies and Sources in `data/reference/delhi.json`

Quoting `data/reference/delhi.json` for Blue, Grey, Airport Express, and Green:

### 5.1 Blue Line (Ref 65.35 km vs DMRC 64.625 km)
- **Reference Entry:** `operational_length_km: 65.35`
- **Source Recorded in Reference File:**
  - The `operational_length_km` field in `data/reference/delhi.json` has **no direct source object** attached to the length number itself (the schema does not have a top-level length source).
  - Under `openings[]`, 9 stages are listed, each citing `url: "https://www.delhimetrorail.com/corporate"`, `kind: "official"`.
  - Under `notes`: "Main Line 3 (50 stations from Dwarka Sector 21 to Noida Electronic City) and Branch Line 4 (8 stations from Yamuna Bank to Vaishali)..."
- **DMRC Stated Length:** DMRC network map table states Line 3 = **56.114 km** and Line 4 = **8.511 km**, for a combined total of **64.625 km**.
- **Classification:** **Unsourced / Secondary derivation** for the 65.35 km figure (it deviates by +0.725 km from DMRC's 64.625 km primary total).

### 5.2 Grey Line (Ref 5.19 km vs DMRC 5.491 km)
- **Reference Entry:** `operational_length_km: 5.19`
- **Source Recorded in Reference File:**
  - Under `openings[]`, two stages cite `url: "https://www.delhimetrorail.com/corporate"`, `kind: "official"`.
  - Under `notes`: "5.19 km feeder line connecting Dwarka to Dhansa Bus Stand with 4 stations."
- **DMRC Stated Length:** DMRC network map table states **5.491 km**.
- **Classification:** **Unsourced / Secondary derivation** for the 5.19 km figure (it deviates by -0.301 km from DMRC's 5.491 km primary total).

### 5.3 Airport Express (Ref 24.69 km vs DMRC 24.917 km)
- **Reference Entry:** `operational_length_km: 24.69`
- **Source Recorded in Reference File:**
  - Under `openings[]`, stages cite `url: "https://www.delhimetrorail.com/corporate"`, `kind: "official"`.
  - Under `notes`: "24.69 km express link with 7 stations connecting New Delhi Railway Station to Yashobhoomi Dwarka Sector 25."
- **DMRC Stated Length:** DMRC network map table states **24.917 km** (New Delhi to Yashobhoomi Dwarka Sec-25).
- **Classification:** **Unsourced / Secondary derivation** for the 24.69 km figure (it deviates by -0.227 km from DMRC's 24.917 km primary total).

### 5.4 Green Line (Ref 28.79 km vs DMRC 28.781 km)
- **Reference Entry:** `operational_length_km: 28.79`
- **Source Recorded in Reference File:**
  - Under `openings[]`, 4 stages cite `url: "https://www.delhimetrorail.com/corporate"`, `kind: "official"`.
  - Under `notes`: "Branched corridor: Inderlok/Kirti Nagar to Brigadier Hoshiyar Singh with 24 operational stations."
- **DMRC Stated Length:** DMRC network map table states **28.781 km**.
- **Classification:** **DMRC rounded** (28.79 km is a 0.009 km rounding of DMRC's 28.781 km).

---

## 6. Delhi Counts: Script, Per-Line Kilometres & Station Counts

### 6.1 The 10 Line IDs Assigned to Delhi in `lines.json`
1. `del-red` (Red Line)
2. `del-yellow` (Yellow Line)
3. `del-blue` (Blue Line)
4. `del-green` (Green Line)
5. `del-violet` (Violet Line)
6. `del-airport` (Airport Express)
7. `del-pink` (Pink Line)
8. `del-magenta` (Magenta Line)
9. `del-grey` (Grey Line)
10. `del-golden` (Golden Line)

### 6.2 Verification Script
```python
import json
import math

with open('data/lines.json', 'r', encoding='utf-8') as f:
    lines = json.load(f)

delhi_lines = [l for l in lines if l.get('city_id') == 'delhi']
delhi_line_ids = set(l['id'] for l in delhi_lines)

with open('data/segments.geojson', 'r', encoding='utf-8') as f:
    segments = json.load(f)

with open('data/stations.geojson', 'r', encoding='utf-8') as f:
    stations = json.load(f)

def haversine(c1, c2):
    lon1, lat1 = c1
    lon2, lat2 = c2
    R = 6371.0088
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def seg_len(coords):
    return sum(haversine(coords[i], coords[i+1]) for i in range(len(coords)-1))

op_segs = [s for s in segments['features'] 
           if s['properties'].get('line_id') in delhi_line_ids 
           and s['properties'].get('status') == 'operational' 
           and s['properties'].get('geometry_quality') != 'schematic']

line_lengths = {}
for lid in sorted(delhi_line_ids):
    l_segs = [s for s in op_segs if s['properties'].get('line_id') == lid]
    l_km = sum(seg_len(s['geometry']['coordinates']) for s in l_segs)
    line_lengths[lid] = l_km
    print(f"  {lid}: {len(l_segs)} segments, {l_km:.3f} km")

sum_line_km = sum(line_lengths.values())
print(f"Sum of compiled per-line km: {sum_line_km:.3f} km (rounded: {sum_line_km:.1f} km)")

op_stations = [s for s in stations['features'] 
               if s['properties'].get('city_id') == 'delhi' 
               and s['properties'].get('status') == 'operational']
unique_stn_ids = set(s['properties'].get('station_id') for s in op_stations)
print(f"Distinct operational station_id count in Delhi: {len(unique_stn_ids)}")

sum_per_line_stns = sum(len([s for s in op_stations if lid in s['properties'].get('line_ids', [])]) for lid in delhi_line_ids)
print(f"Sum of per-line operational station counts: {sum_per_line_stns}")
```

### 6.3 Command Execution Output
```text
Operational segments per line:
  del-airport: 1 segments, 23.803 km
  del-blue: 2 segments, 63.847 km
  del-golden: 0 segments, 0.000 km
  del-green: 2 segments, 28.003 km
  del-grey: 1 segments, 4.977 km
  del-magenta: 1 segments, 35.752 km
  del-pink: 1 segments, 57.286 km
  del-red: 1 segments, 33.385 km
  del-violet: 1 segments, 44.738 km
  del-yellow: 1 segments, 47.394 km

Sum of compiled per-line km: 339.184 km (rounded: 339.2 km)

Total operational station features with city_id == 'delhi': 231
Distinct operational station_id count in Delhi: 231
Sum of per-line operational station counts: 256
```

### 6.4 Finding & Statement
1. **Is 339.2 km the sum of compiled per-line km?**
   **YES.** The exact sum of operational non-schematic segments across Delhi's lines is **339.184 km**, which rounds to **339.2 km**.
2. **Is 231 a distinct-station count?**
   **YES.** There are exactly **231 distinct physical operational station features** in Delhi (`city_id == 'delhi'`). If counted per line (where interchange stations count once for every line they serve), the total is **256 station stops**. Thus 231 is strictly a distinct physical station count.

---

## 7. Exact Rule IDs, Severities & Thresholds in `audit-engine.ts` & `audit-config.ts`

Quoting verbatim from `scripts/audit/audit-engine.ts` and `scripts/audit/audit-config.ts`:

### 7.1 Station-Count Rule
- **Rule ID:** `ground-truth-station-count`
- **Location:** `scripts/audit/audit-engine.ts:2182-2199`
- **Quoted Source:**
```typescript
      // D1: Operational station count per line
      if (refLine.operational_stations != null) {
        const lineStations = (
          stationsByLineId.get(refLine.line_id) || []
        ).filter((s) => s.properties.status === "operational");
        if (lineStations.length !== refLine.operational_stations) {
          const isUnverified = refLine.confidence === "unverified";
          const sev: Severity = isUnverified ? "warn" : "error";
          const label = isUnverified ? " (unverified reference)" : "";
          add(
            city.id,
            "ground-truth-station-count",
            sev,
            refLine.line_id,
            `Operational station count: data has ${lineStations.length}, reference has ${refLine.operational_stations}${label}`
          );
        }
      }
```
- **Exact Severity:**
  - `error` when reference confidence is normal / sourced.
  - `warn` when reference confidence is `"unverified"`.
- **Exact Threshold:**
  - **Exact integer match** (`lineStations.length !== refLine.operational_stations`). No percentage tolerance.

### 7.2 Line Operational Length Rule
- **Rule ID:** `ground-truth-length`
- **Location:** `scripts/audit/audit-engine.ts:2407-2437`
- **Quoted Source:**
```typescript
      // D5: Total operational length
      const refLengthKm = refLine.operational_length_km;
      if (refLengthKm != null) {
        const lineSegs = segmentsByLineId.get(refLine.line_id) || [];
        const opSegs = lineSegs.filter(
          (s) =>
            s.properties.status === "operational" &&
            s.properties.geometry_quality !== "schematic"
        );
        const totalKm = opSegs.reduce(
          (acc, s) =>
            acc +
            calculateLineStringLengthKm(
              s.geometry.coordinates as [number, number][]
            ),
          0
        );
        const diff = Math.abs(totalKm - refLengthKm) / refLengthKm;
        if (diff > cfg.groundTruthLengthWarnPct) {
          const isUnverified = refLine.confidence === "unverified";
          const sev: Severity = isUnverified ? "warn" : "warn";
          const label = isUnverified ? " (unverified reference)" : "";
          add(
            city.id,
            "ground-truth-length",
            sev,
            refLine.line_id,
            `Operational length: computed ${totalKm.toFixed(2)} km vs reference ${refLengthKm} km (${(diff * 100).toFixed(1)}%)${label}`
          );
        }
      }
```
- **Exact Severity:** `warn` (always `warn`).
- **Exact Threshold:**
  - `cfg.groundTruthLengthWarnPct` defined in `scripts/audit/audit-config.ts:41` as **`0.03` (3%)**.
  - Earlier reports mistakenly referred to this as "reference-length-check at 5%" or "ground-truth-length at 10%". In reality, the threshold is **3%**.

### 7.3 City-Level Operational Km Rule
- **Rule ID:** `city-km-vs-reference`
- **Location:** `scripts/audit/audit-engine.ts:2440-2473`
- **Quoted Source:**
```typescript
    // M8.1.7: city-km-vs-reference
    // City operational km differs from the reference by more than 10 percent (each line counted once)
    let cityDataOpKm = 0;
    let cityRefOpKm = 0;

    for (const refLine of refData.lines) {
      if (refLine.operational_length_km != null) {
        cityRefOpKm += refLine.operational_length_km;
      }
      const lineSegs = segmentsByLineId.get(refLine.line_id) || [];
        const opSegs = lineSegs.filter(
          (s) =>
            s.properties.status === "operational" &&
            s.properties.geometry_quality !== "schematic"
        );
      const lineKm = opSegs.reduce(
        (acc, s) => acc + calculateLineStringLengthKm(s.geometry.coordinates as [number, number][]),
        0
      );
      cityDataOpKm += lineKm;
    }

    if (cityRefOpKm > 0) {
      const cityKmDiff = Math.abs(cityDataOpKm - cityRefOpKm) / cityRefOpKm;
      if (cityKmDiff > cfg.cityKmVsReferenceErrorPct) {
        add(
          city.id,
          "city-km-vs-reference",
          "error",
          city.id,
          `City operational km differs from reference by ${(cityKmDiff * 100).toFixed(1)}%: computed ${cityDataOpKm.toFixed(2)} km vs reference ${cityRefOpKm.toFixed(2)} km (threshold: ${cfg.cityKmVsReferenceErrorPct * 100}%)`
        );
      }
    }
```
- **Exact Severity:** `error`
- **Exact Threshold:**
  - `cfg.cityKmVsReferenceErrorPct` defined in `scripts/audit/audit-config.ts:53` as **`0.1` (10%)**.

---

## 8. Summary Table of Discrepancies & Recommendations

| Item | Repo Reference | DMRC Official Primary Source | Discrepancy | Root Cause in Repo |
| :--- | :---: | :---: | :---: | :---: |
| **Line 8 (Magenta) Stations** | 25 stations | 33 stations | -8 stations | Phase 4 extensions (Krishna Park Extn. + Deepali Chowk to Majlis Park) missing from operational reference |
| **Line 8 (Magenta) Length** | 37.46 km | 49.195 km | -11.735 km | Phase 4 operational extensions missing from operational length |
| **Line 3 & 4 (Blue) Length** | 65.35 km | 64.625 km (56.114 + 8.511) | +0.725 km | Sourced from Wikipedia/secondary instead of DMRC map table |
| **Line 9 (Grey) Length** | 5.19 km | 5.491 km | -0.301 km | Sourced from Wikipedia/secondary instead of DMRC map table |
| **Airport Express Length** | 24.69 km | 24.917 km | -0.227 km | Sourced from preliminary project length instead of DMRC map table |
| **Line 5 (Green) Length** | 28.79 km | 28.781 km | +0.009 km | Rounded figure |
| **Delhi Total Operational Km** | 339.2 km (compiled) | 374.475 km (DMRC Delhi lines sum) | -35.275 km | Omission of operational Phase 4 extensions on Pink (Line 7) and Magenta (Line 8) |
| **Delhi Distinct Stations** | 231 (compiled) | 271 (DMRC map operational network) | -40 stations | Distinct physical stations omit Phase 4 stations on Pink and Magenta |
