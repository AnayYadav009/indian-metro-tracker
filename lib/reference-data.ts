import agraRef from "@/data/reference/agra.json";
import ahmedabadRef from "@/data/reference/ahmedabad.json";
import bengaluruRef from "@/data/reference/bengaluru.json";
import bhopalRef from "@/data/reference/bhopal.json";
import chennaiRef from "@/data/reference/chennai.json";
import delhiRef from "@/data/reference/delhi.json";
import gurugramRef from "@/data/reference/gurugram.json";
import hyderabadRef from "@/data/reference/hyderabad.json";
import indoreRef from "@/data/reference/indore.json";
import jaipurRef from "@/data/reference/jaipur.json";
import kanpurRef from "@/data/reference/kanpur.json";
import kochiRef from "@/data/reference/kochi.json";
import kolkataRef from "@/data/reference/kolkata.json";
import lucknowRef from "@/data/reference/lucknow.json";
import meerutRef from "@/data/reference/meerut.json";
import mumbaiRef from "@/data/reference/mumbai.json";
import nagpurRef from "@/data/reference/nagpur.json";
import naviMumbaiRef from "@/data/reference/navi-mumbai.json";
import noidaRef from "@/data/reference/noida.json";
import patnaRef from "@/data/reference/patna.json";
import puneRef from "@/data/reference/pune.json";
import suratRef from "@/data/reference/surat.json";

export interface ReferenceLine {
  line_id?: string;
  official_name?: string;
  terminals?: string[];
  topology?: string;
  status?: string;
  operator?: string;
  operational_length_km?: number | null;
  official_length_km?: number | null;
}

export interface ReferenceFile {
  city_id: string;
  lines: ReferenceLine[];
}

export const REFERENCE_MAP: Record<string, ReferenceFile> = {
  agra: agraRef as ReferenceFile,
  ahmedabad: ahmedabadRef as ReferenceFile,
  bengaluru: bengaluruRef as ReferenceFile,
  bhopal: bhopalRef as ReferenceFile,
  chennai: chennaiRef as ReferenceFile,
  delhi: delhiRef as ReferenceFile,
  gurugram: gurugramRef as ReferenceFile,
  hyderabad: hyderabadRef as ReferenceFile,
  indore: indoreRef as ReferenceFile,
  jaipur: jaipurRef as ReferenceFile,
  kanpur: kanpurRef as ReferenceFile,
  kochi: kochiRef as ReferenceFile,
  kolkata: kolkataRef as ReferenceFile,
  lucknow: lucknowRef as ReferenceFile,
  meerut: meerutRef as ReferenceFile,
  mumbai: mumbaiRef as ReferenceFile,
  nagpur: nagpurRef as ReferenceFile,
  "navi-mumbai": naviMumbaiRef as ReferenceFile,
  noida: noidaRef as ReferenceFile,
  patna: patnaRef as ReferenceFile,
  pune: puneRef as ReferenceFile,
  surat: suratRef as ReferenceFile,
};
