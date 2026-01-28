import { AGE_GROUPS, DX, DISPOSITIONS, dxByNo } from './constants.js';

export function computeSummary(visits){
  const s = {
    total: visits.length,
    male: 0, female: 0,
    surgTotal: 0, ww: 0, nonww: 0,
    dispo: Object.fromEntries(DISPOSITIONS.map(d => [d,0])),
    ageGender: {
      "<5": { Male:0, Female:0 },
      "5-14": { Male:0, Female:0 },
      "15-17": { Male:0, Female:0 },
      "≥18": { Male:0, Female:0 },
    },
    dxCounts: Object.fromEntries(DX.map(d => [d.no, 0])),
  };

  for (const v of visits){
    if (v.gender === 'Male') s.male++;
    if (v.gender === 'Female') s.female++;

    if (s.dispo[v.disposition] !== undefined) s.dispo[v.disposition]++;

    if (s.ageGender[v.ageGroup] && s.ageGender[v.ageGroup][v.gender] !== undefined){
      s.ageGender[v.ageGroup][v.gender] += 1;
    }

    for (const no of (v.diagnoses || [])){
      if (s.dxCounts[no] !== undefined) s.dxCounts[no] += 1;
    }

    if (v.isSurgical){
      s.surgTotal++;
      if (v.wwStatus === 'WW') s.ww++;
      if (v.wwStatus === 'Non-WW') s.nonww++;
    }
  }

  return s;
}

export function isSurgicalByDx(diagnoses){
  return (diagnoses || []).some(no => (dxByNo(no)?.cat === 'S'));
}
