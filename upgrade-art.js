// Same mature illustration style as inventory and shop parts.
const ids=new Set(['turbo','exhaust','ecu','cams','air','nitro']);
export const upgradeArt=id=>`<img class="part-art upgrade-art" src="assets/store/upgrade-${ids.has(id)?id:'turbo'}.webp" alt="" draggable="false">`;
