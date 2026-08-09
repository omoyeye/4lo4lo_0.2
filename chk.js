const fs=require('fs');
const defs=fs.readFileSync('routes.txt','utf8').trim().split('\n').map(s=>s.trim()).filter(Boolean);
const used=fs.readFileSync('used.txt','utf8').trim().split('\n').map(s=>s.trim()).filter(Boolean);
const re=defs.map(d=>({d,r:new RegExp('^'+d.replace(/\[\.\.\..*?\]/g,'.+').replace(/\[[^\]]+\]/g,'[^/]+')+'$')}));
const miss=[];
for(const u of used){
  const n=u.replace(/\$\{[^}]*\}/g,'X').replace(/%s/g,'X').replace(/\/$/,'');
  if(n==='/api')continue;
  if(!re.some(x=>x.r.test(n))) miss.push(u);
}
console.log('=== CALLED BUT NO ROUTE FILE ===');
miss.forEach(m=>console.log(m));
const usedNorm=used.map(u=>u.replace(/\$\{[^}]*\}/g,'X'));
console.log('\n=== ROUTE EXISTS BUT NEVER CALLED ===');
for(const {d,r} of re){ if(!usedNorm.some(u=>r.test(u))) console.log(d); }
