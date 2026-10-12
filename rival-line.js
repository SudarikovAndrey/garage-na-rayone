// Реплика соперника после заезда. Слово даётся тем, у кого есть лицо и характер: боссам районов, особым
// главарям и знакомым соперникам. Каждая реплика звучит один раз на исход: проиграл — босс поддел, и при
// переигровке молчит; выиграл — проигравший отозвался, и больше не повторяется. Ключ сохранения `linesSeen`.
import {characterFor,resultLineFor,portraitFor} from './characters.js';

export const LINES_KEEP=600;
const key=(opp,won)=>`${opp.id}:${won?'win':'lose'}`;

export function restoreLines(s,d){s.linesSeen=Array.isArray(d.linesSeen)?[...new Set(d.linesSeen.filter(x=>typeof x==='string'))].slice(-LINES_KEEP):[];}
export const lineSeen=(s,opp,won)=>Array.isArray(s.linesSeen)&&s.linesSeen.includes(key(opp,won));
export function markLineSeen(s,opp,won){if(!Array.isArray(s.linesSeen))s.linesSeen=[];const k=key(opp,won);if(!s.linesSeen.includes(k))s.linesSeen.push(k);if(s.linesSeen.length>LINES_KEEP)s.linesSeen.splice(0,s.linesSeen.length-LINES_KEEP);}

// Что сказать после заезда: реплика персонажа из состава или знакомого соперника. У безымянных главарей
// реплик нет — экран не показывается. Тренировка и дуэли — тоже молчат.
export function lineAfterRace(opp,won,{practice=false,duel=false}={}){
 if(!opp||practice||duel||opp.drift)return null;
 const character=characterFor(opp.name);
 let text=character?resultLineFor(opp.name,won):null;
 if(!text&&opp.rival)text=won?opp.rival.lose:opp.rival.win;
 if(!text)return null;
 return {name:opp.name,role:character?.role||(opp.rival?'Знакомый с района':''),text,won,portrait:portraitFor(opp.name),kicker:won?'ПОСЛЕ ЗАЕЗДА · ТЫ ВЫВЕЗ':'ПОСЛЕ ЗАЕЗДА · ОН ВЫВЕЗ'};
}
// Показать один раз: если уже слышали — null и ничего не помечаем.
export function lineOnce(s,opp,won,options){if(lineSeen(s,opp,won))return null;const line=lineAfterRace(opp,won,options);if(line)markLineSeen(s,opp,won);return line;}
