import { TMAVE_VZHLEDY } from "./sbirka";

/** Nastaví vzhled před prvním vykreslením, ať appka při načtení nebliká klasikem. */
export const VZHLED_SCRIPT = `(function(){try{var t=localStorage.getItem('matemax-trida')==='5'?5:9;var s=JSON.parse(localStorage.getItem('matemax-sbirka')||'null');if(!s||!s.nasazeno||!s.nasazeno[t])return;var id=s.nasazeno[t].vzhled;if(!id||(s.mam||[]).indexOf(id)<0)return;var k=id.split('-').pop();if(k==='klasik')return;var d=document.documentElement;d.setAttribute('data-vzhled',k);if(${JSON.stringify([...TMAVE_VZHLEDY])}.indexOf(k)>=0)d.setAttribute('data-vzhled-tmavy','');}catch(e){}})();`;
