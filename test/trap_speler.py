# De speler loopt elke huistrap op (bordestrap in woningen/kantoren): komt hij boven?
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
CITIES=sys.argv[1:] or ['sample','stad']
JS="""()=>{const S=window.__SC(); const P=S.player, K=S.keys; const out=[]; const seen=new Set();
  for(const [k,col] of S.colMap){ const su=col.surfaces.filter(s=>s.kind==='slopeU'); for(let i=0;i+1<su.length;i+=2){ const a=su[i], b=su[i+1]; if(a.y1<=a.y0) continue;
    const key=k+'|'+a.y0.toFixed(1); if(seen.has(key)) continue; seen.add(key);
    const W=(u,p)=>[a.cx+a.tx*u+a.nx*p, a.cz+a.tz*u+a.nz*p];
    const pI=(a.p0+a.p1)/2, pO=(b.p0+b.p1)/2, top=b.y0;
    const wp=[[...W(a.u0-0.9,pI),a.y0],[...W(a.u0+0.3,pI),a.y0],[...W(a.u1+0.9,pI),a.y1],[...W(a.u1+0.9,pO),a.y1],[...W(a.u0+0.3,pO),top],[...W(a.u0-1.2,pO),top]];
    // start: op de vloer vlak voor de trap
    Object.assign(P,{x:wp[0][0],z:wp[0][1],y:a.y0,vy:0,pitch:0,grounded:true,dropping:false});
    let t=0, wi=1, stuckT=0, last=[P.x,P.z], why='';
    for(const kk in K) delete K[kk]; K.KeyW=true;
    while(t<40 && wi<wp.length){ const g=wp[wi]; const dx=g[0]-P.x, dz=g[1]-P.z, d=Math.hypot(dx,dz); if(d<0.35){ wi++; continue; }
      P.yaw=Math.atan2(-dx,-dz); S.updateWalk(1/30); t+=1/30;
      const mv=Math.hypot(P.x-last[0],P.z-last[1]); last=[P.x,P.z]; if(mv<0.01){ stuckT+=1/30; if(stuckT>2){ why='vast bij punt '+wi; break; } } else stuckT=0; }
    delete K.KeyW;
    const ok=wi>=wp.length && Math.abs(P.y-top)<0.3;
    out.push({k, base:+a.bottom.toFixed(1), ok, why: ok?'':(why||('niet boven: y='+P.y.toFixed(2)+' doel '+top.toFixed(2)+' punt '+wi)), t:+t.toFixed(1)});
  } }
  return out}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":800,"height":500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'normaal'})); localStorage.setItem('raatstad-mensen','0'); localStorage.setItem('raatstad-keys-seen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        bad=0
        for city in CITIES:
            await pg.evaluate("(c)=>window.__SC().doAct(c)", city); await pg.wait_for_timeout(2500 if city!='stad' else 12000)
            await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
            r=await pg.evaluate(JS)
            fails=[x for x in r if not x['ok']]; bad+=len(fails)
            print(city, 'trappen', len(r), 'mis', len(fails)); 
            for f in fails[:12]: print('  ', json.dumps(f))
            await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(500)
        print('OK' if not bad else 'FOUT', 'fouten:', errs[:3]); await b.close()
asyncio.run(main())
