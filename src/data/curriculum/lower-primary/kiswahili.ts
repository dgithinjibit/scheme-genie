import type { StrandInfo } from "../types";

// Helper to create standard 4 sub-strands per Mada (each 3 Vipindi)
function mada(name: string): StrandInfo {
  return {
    name,
    subStrands: [
      { name: "Kusikiliza na Kuzungumza", lessons: 3 },
      { name: "Kusoma", lessons: 3 },
      { name: "Kuandika", lessons: 3 },
      { name: "Sarufi", lessons: 3 },
    ],
  };
}

// ─── Grade 1 Kiswahili (Verified from KICD PDF: Gredi ya 1) ───
export const grade1Kiswahili: StrandInfo[] = [
  mada("1.0 Darasani"),
  mada("2.0 Familia"),
  mada("3.0 Tarakimu"),
  mada("4.0 Siku za Wiki"),
  mada("5.0 Mimi na Wenzangu"),
  mada("6.0 Mwili Wangu"),
  mada("7.0 Usafi wa Mwili"),
  mada("8.0 Vyakula Vyetu"),
  mada("9.0 Jikoni"),
  mada("10.0 Michezo"),
];

// ─── Grade 2 Kiswahili (Verified from KICD PDF: Gredi ya 2) ───
export const grade2Kiswahili: StrandInfo[] = [
  mada("1.0 Shuleni"),
  mada("2.0 Haki Zangu"),
  mada("3.0 Lishe Bora"),
  mada("4.0 Usafiri"),
  mada("5.0 Mnyama Nimpendaye"),
  mada("6.0 Ukoo"),
  mada("7.0 Sebuleni"),
  mada("8.0 Usalama Wangu"),
  mada("9.0 Hospitalini"),
  mada("10.0 Hali ya Anga"),
];

// ─── Grade 3 Kiswahili (Verified from KICD PDF: Gredi ya 3) ───
export const grade3Kiswahili: StrandInfo[] = [
  mada("1.0 Uzalendo"),
  mada("2.0 Shambani"),
  mada("3.0 Miezi ya Mwaka"),
  mada("4.0 Kazi Mbalimbali"),
  mada("5.0 Usalama"),
  mada("6.0 Usafi wa Mazingira"),
  mada("7.0 Dukani"),
  mada("8.0 Ndege Nimpendaye"),
  mada("9.0 Sokoni"),
  mada("10.0 Teknolojia"),
];
