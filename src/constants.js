export const DX = [
  { no: 1, name: "Respiratory Tract Infection", cat: "M", short: "RTI" },
  { no: 2, name: "Acute Watery Diarrhea", cat: "M", short: "AWD" },
  { no: 3, name: "Acute Bloody Diarrhea", cat: "M", short: "ABD" },
  { no: 4, name: "Acute Viral Hepatitis", cat: "M", short: "Hep" },
  { no: 5, name: "Other GI Diseases", cat: "M", short: "OGI" },
  { no: 6, name: "Scabies", cat: "M", short: "Scab" },
  { no: 7, name: "Skin Infection", cat: "M", short: "SkinInf" },
  { no: 8, name: "Other Skin Diseases", cat: "M", short: "OSkin" },
  { no: 9, name: "Genitourinary Diseases", cat: "M", short: "GU" },
  { no: 10, name: "Musculoskeletal Diseases", cat: "M", short: "MSK" },
  { no: 11, name: "Hypertension", cat: "M", short: "HTN" },
  { no: 12, name: "Diabetes", cat: "M", short: "DM" },
  { no: 13, name: "Epilepsy", cat: "M", short: "Epi" },
  { no: 14, name: "Eye Diseases", cat: "M", short: "Eye" },
  { no: 15, name: "ENT Diseases", cat: "M", short: "ENT" },
  { no: 16, name: "Other Medical Diseases", cat: "M", short: "OMed" },
  { no: 17, name: "Fracture", cat: "S", short: "Fx" },
  { no: 18, name: "Burn", cat: "S", short: "Burn" },
  { no: 19, name: "Gunshot Wound (GSW)", cat: "S", short: "GSW" },
  { no: 20, name: "Other Wound", cat: "S", short: "Wound" },
  { no: 21, name: "Other Surgical", cat: "S", short: "OSurg" },
];

export const DISPOSITIONS = [
  "Discharged",
  "Admitted",
  "Referred to ED",
  "Referred out",
];

export const AGE_GROUPS = ["<5", "5-14", "15-17", "≥18"];
export const GENDERS = ["Male", "Female"];
export const WW_OPTIONS = ["WW", "Non-WW"];

export function dxByNo(no){
  return DX.find(d => d.no === no) || null;
}
