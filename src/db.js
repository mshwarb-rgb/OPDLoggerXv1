import { openDB } from 'idb';

const DB_NAME = 'opd_loggerx_db';
const DB_VERSION = 1;

export async function getDb(){
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db){
      if (!db.objectStoreNames.contains('visits')) {
        const store = db.createObjectStore('visits', { keyPath: 'id' });
        store.createIndex('by_date', 'visitDate');
        store.createIndex('by_date_time', ['visitDate','time']);
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });
}

export async function saveVisit(visit){
  const db = await getDb();
  await db.put('visits', visit);
}

export async function deleteVisit(id){
  const db = await getDb();
  await db.delete('visits', id);
}

export async function getVisitsByDate(visitDate){
  const db = await getDb();
  return db.getAllFromIndex('visits', 'by_date', visitDate);
}

export async function getAllVisits(){
  const db = await getDb();
  return db.getAll('visits');
}

export async function getAllDates(){
  const db = await getDb();
  const visits = await db.getAll('visits');
  const set = new Set(visits.map(v => v.visitDate));
  return Array.from(set).sort((a,b)=> b.localeCompare(a));
}

export async function getSetting(key, fallback=null){
  const db = await getDb();
  const item = await db.get('settings', key);
  return item ? item.value : fallback;
}

export async function setSetting(key, value){
  const db = await getDb();
  await db.put('settings', { key, value });
}
