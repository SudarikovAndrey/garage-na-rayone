import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
// Every game model is meshopt-compressed (scripts/compress-assets.mjs); one loader factory keeps the decoder wired.
export function createGLTFLoader(){const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);return loader;}
