import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const out = 'public/expedition';
const base = 'https://raw.githubusercontent.com/josuejitzu/Santa_AR_testing/adca9b762f1b7dd25eee96bebc613f6fdcdb7397/modelos/santa_claus_02/';
await fs.mkdir(out, {recursive:true});
async function bytes(url) {
  for (let n=0;;n++) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
      if(!response.ok) throw Error(response.status+' '+url);
      return Buffer.from(await response.arrayBuffer());
    } catch(err) {if(n>=2) throw err;}
  }
}
const model=JSON.parse((await bytes(base+'scene.gltf')).toString());
await Promise.all(model.images.map(async image=>{
  const name=path.basename(image.uri,'.png')+'.webp';
  await sharp(await bytes(base+image.uri)).resize({width:1024,withoutEnlargement:true}).webp({quality:85}).toFile(out+'/'+name);
  image.uri=name;
}));
await fs.writeFile(out+'/scene.bin',await bytes(base+'scene.bin'));
await fs.writeFile(out+'/santa.gltf',JSON.stringify(model));
console.log('Prepared licensed Santa character, skeleton and four optimized texture maps.');
try {
  await fs.writeFile(out+'/winter.hdr',await bytes('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/stierberg_sunrise_1k.hdr'));
} catch {console.warn('Panorama mirror unavailable; using the bundled procedural winter sky.');}
