import * as T from 'three';
// Keep shader source IDs alive across scene disposal. Programs alone are not
// enough: three.js assigns new source IDs when the final ShaderMaterial dies.
// Each live effect owns its uniforms; idle materials retain no scene/texture data.
const idle=new Map();let idleCount=0;
export const SHADER_MATERIAL_POOL_LIMIT=48;
export function pooledShaderMaterial(key,parameters){
 const bucket=idle.get(key);let material=bucket?.pop();
 if(material){idleCount--;for(const [name,u] of Object.entries(parameters.uniforms||{})){material.uniforms[name].value=u.value;parameters.uniforms[name]=material.uniforms[name];}}
 else{
  material=new T.ShaderMaterial(parameters);
  const destroy=material.dispose.bind(material);
  material.dispose=()=>{
   if(!material.userData.poolLeased)return;
   material.userData.poolLeased=false;
   // Uniform containers stay stable: renderer properties reference them.
   for(const u of Object.values(material.uniforms))u.value=null;
   if(idleCount>=SHADER_MATERIAL_POOL_LIMIT){destroy();return;}
   const list=idle.get(key)||[];list.push(material);idle.set(key,list);idleCount++;
  };
 }
 material.userData.poolLeased=true;return material;
}
