// Декали = ливреи из liveries.js. Здесь — реестр для игры: владение, раздача по редкости, миграция
// старых сейвов. Выигранная любой машиной ливрея принадлежит всему гаражу.
import {LIVERIES,LEGACY_DECALS,liveryById} from './liveries.js';

const cssPreview=l=>`linear-gradient(180deg,transparent 0 30%,${l.palette.main} 30% 58%,${l.palette.accent} 58% 64%,transparent 64%)`;
export const DECALS=LIVERIES.map(l=>({id:l.id,name:l.name,description:l.description,rarity:l.rarity,colors:[l.palette.main,l.palette.accent,l.palette.ink],preview:cssPreview(l),finish:l.finish,livery:true,personal:l.personal||null}));
export const DECAL_CHANCE=.18;
export const decalById=id=>DECALS.find(d=>d.id===id);
// Именные ливреи: их носит персонаж, а игрок получает как трофей за победу над ним.
export const PERSONAL_DECALS=Object.fromEntries(DECALS.filter(d=>d.personal).map(d=>[d.personal,d.id]));
// Раздача: ящики сыпят обычные и редкие; главари серий дают редкие в первых двух районах, эпические дальше,
// легендарные — с пятого района; боссы и особые главари носят именные.
export const CRATE_DECALS=DECALS.filter(d=>d.rarity<=1&&!d.personal);
// Именные ливреи из общей раздачи исключены во всех районах: пояс Кисули доставался случайным главарям,
// и розовый номер приезжал, например, на Волге Деда Турбо — машина читалась как чужая.
const pools=[1,1,2,2,3].map(rarity=>DECALS.filter(d=>d.rarity===rarity&&!d.personal));
export const bossDecal=id=>{const n=Math.max(0,Number(id)||0),district=Math.min(4,Math.floor(n/45)),series=Math.floor((n%45)/5),pool=pools[district];return pool[(series+district*3)%pool.length].id;};
export const ownsDecal=(s,id)=>!!decalById(id)&&Array.isArray(s.ownedDecals)&&s.ownedDecals.some(list=>Array.isArray(list)&&list.includes(id));
const migrate=id=>decalById(id)?id:LEGACY_DECALS[id]||null;
export function restoreDecals(s,d,count){
 s.decalUnlockVersion=2;
 s.ownedDecals=Array.from({length:count},(_,car)=>[...new Set((Array.isArray(d.ownedDecals?.[car])?d.ownedDecals[car]:[]).map(migrate).filter(Boolean))]);
 s.decal=Array.from({length:count},(_,car)=>{const id=migrate(d.decal?.[car]);return ownsDecal(s,id)?id:null;});
}
export function addDecal(s,id,car=s.selected){
 const decal=decalById(id),index=Math.max(0,Math.min(s.ownedDecals.length-1,Math.floor(Number(car)||0)));if(!decal)throw Error('Неизвестная декаль');
 const duplicate=ownsDecal(s,id),scrap=duplicate?30:0;if(duplicate)s.scrap+=scrap;else s.ownedDecals[index].push(id);return {id,car:index,duplicate,scrap};
}
export function rollDecalBonus(s,rng=Math.random){
 const chance=Number(rng());if(!Number.isFinite(chance)||chance>=DECAL_CHANCE)return null;
 const pool=CRATE_DECALS.filter(d=>!ownsDecal(s,d.id));if(!pool.length){s.scrap+=30;return {car:s.selected,duplicate:true,scrap:30};}
 const roll=Math.max(0,Math.min(.999999,Number(rng())||0)),decal=pool[Math.floor(roll*pool.length)];return addDecal(s,decal.id);
}
