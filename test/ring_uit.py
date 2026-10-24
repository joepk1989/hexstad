# Hexstad: de speler loopt vanaf de ringweg recht naar buiten (en weer naar binnen) in 36 richtingen: loopt hij nergens vast?
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
JS="""()=>{const S=window.__SC(); const P=S.player, K=S.keys; const out=[]; const WB=window.__modDbg().whyBlocked;
  const run=(x0,z0,x1,z1)=>{ Object.assign(P,{x:x0,z:z0,y:S.floorAt(x0,z0,50),vy:0,pitch:0,grounded:true,dropping:false}); for(const k in K) delete K[k]; K.KeyW=true; let t=0,stuckT=0,last=[P.x,P.z];
    while(t<90){ const dx=x1-P.x, dz=z1-P.z; if(Math.hypot(dx,dz)<4) { delete K.KeyW; return null; } P.yaw=Math.atan2(-dx,-dz); S.updateWalk(1/30); S.cars.update(1/30); t+=1/30; const mv=Math.hypot(P.x-last[0],P.z-last[1]); last=[P.x,P.z]; if(mv<0.005){ stuckT+=1/30; if(stuckT>6){ delete K.KeyW; return {x:+P.x.toFixed(1),z:+P.z.toFixed(1),y:+P.y.toFixed(2),floor:+S.floorAt(P.x,P.z,P.y).toFixed(2), why:JSON.stringify(WB(P.x-Math.sin(P.yaw)*0.1,P.z-Math.cos(P.yaw)*0.1,P.y)).slice(0,120), car:S.cars.blocks(P.x-Math.sin(P.yaw)*0.3,P.z-Math.cos(P.yaw)*0.3,P.y), ppl:S.people.blocks(P.x-Math.sin(P.yaw)*0.3,P.z-Math.cos(P.yaw)*0.3,P.y), water:null, yaw:+P.yaw.toFixed(2), tgt:[+x1.toFixed(0),+z1.toFixed(0)]}; } } else stuckT=0; }
    delete K.KeyW; return {x:+P.x.toFixed(1),z:+P.z.toFixed(1),y:+P.y.toFixed(2),why:'niet aangekomen'}; };
  for(const i of [18,30]){ const a=i/36*Math.PI*2, c=Math.cos(a), s=Math.sin(a);
    const r1=run(c*255,s*255,c*420,s*420); if(r1) out.push(Object.assign({hoek:i*10,richting:'uit'},r1));
    const r2=run(c*420,s*420,c*255,s*255); if(r2) out.push(Object.assign({hoek:i*10,richting:'in'},r2)); }
  return out}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":800,"height":500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','0'); localStorage.setItem('hexstad-keys-seen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('stad')"); await pg.wait_for_timeout(12000)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
        r=await pg.evaluate(JS)
        print('vastlopers', len(r))
        for x in r[:30]: print('  ', json.dumps(x, ensure_ascii=False))
        print('OK' if not r else 'FOUT', 'fouten:', errs[:3]); await b.close()
asyncio.run(main())
