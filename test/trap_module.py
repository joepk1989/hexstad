# De speler loopt elke moduletrap op (v2-modules in de stad): komt hij boven?
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
CITIES=sys.argv[1:] or ['mall','stad']
JS="""()=>{const S=window.__SC(); const P=S.player, K=S.keys, C=S.getCells(); const out=[]; const SQ3=Math.sqrt(3);
  for(const I of (C.inst||[])){ const m=I.m; if(!m||m.v!==2||!m.lv) continue; const ts=S.mv2Ts(m), tf=S.mv2Tf(I.rot||0,I.q,I.r), LH=S.MV2.LV_H, G=S.gH(I.q,I.r)+(I.lv||0)*LH;
    m.lv.forEach((L,li)=>{ for(const st of (L.s||[])){ if(st.k==='hexramp') continue;
      const D=S.MV2.DIR6[st.d]||S.MV2.DIR6[0], a=S.mv2P(st.a[0],st.a[1],ts), len=(st.n||2)*ts, w=st.w||2;
      const dx=D[0]*ts*SQ3/2, dz=D[0]*ts/2+D[1]*ts, dl=Math.hypot(dx,dz)||1, ux=dx/dl, uz=dz/dl, nx=-uz, nz=ux, off=st.off||0, rise=st.h||LH;
      const at=(al,lat)=>tf(a[0]+ux*al+nx*(lat+off), a[1]+uz*al+nz*(lat+off));
      const p0=at(-1.2,0), p1=at(len+1.2,0);
      const want=G+li*LH, base=S.floorAt(p0[0],p0[1],want+0.3);
      if(Math.abs(base-want)>0.6) { out.push({mod:m.name,q:I.q,r:I.r,li,lv:I.lv||0,ok:false,why:'geen vloer bij de trapvoet: '+base.toFixed(2)+' verwacht '+want.toFixed(2)}); continue; }
      Object.assign(P,{x:p0[0],z:p0[1],y:base,vy:0,pitch:0,grounded:true,dropping:false});
      for(const kk in K) delete K[kk]; K.KeyW=true; let t=0, stuckT=0, last=[P.x,P.z], why='';
      while(t<30){ const gx=p1[0]-P.x, gz=p1[1]-P.z; if(Math.hypot(gx,gz)<0.3) break; P.yaw=Math.atan2(-gx,-gz); S.updateWalk(1/30); t+=1/30; const mv=Math.hypot(P.x-last[0],P.z-last[1]); last=[P.x,P.z]; if(mv<0.01){stuckT+=1/30; if(stuckT>2){why='vast op '+(((P.x-p0[0])*ux*0+Math.hypot(P.x-p0[0],P.z-p0[1])).toFixed(1))+' m, y='+P.y.toFixed(2)+' '+JSON.stringify(window.__modDbg().whyBlocked(P.x+Math.sin(P.yaw)*-0.1,P.z+Math.cos(P.yaw)*-0.1,P.y)).slice(0,300); break;}} else stuckT=0; }
      delete K.KeyW; const ok=!why && Math.abs(P.y-(base+rise))<0.35;
      out.push({mod:m.name, q:I.q, r:I.r, li, lv:I.lv||0, ok, why: ok?'':(why||('eind y='+P.y.toFixed(2)+' verwacht '+(base+rise).toFixed(2)+' afstand '+Math.hypot(p1[0]-P.x,p1[1]-P.z).toFixed(1)))});
    } });
  }
  return out}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":800,"height":500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'normaal'})); localStorage.setItem('raatstad-mensen','0'); localStorage.setItem('raatstad-keys-seen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        bad=0
        for city in CITIES:
            if city=='lib':   # alle bibliotheekmodules met een trap, op lege grond in een rij (grote stappen, met de ruimte voor 7-vaks modules)
                n=await pg.evaluate("""()=>{const S=window.__SC(); S.doAct('empty'); const C=S.getCells(); C.inst=[]; let i=0;
                  for(const m of S.libStandard()){ if(!m.lv||!m.lv.some(L=>(L.s||[]).some(st=>st.k!=='hexramp'))) continue; const q=(i%6)*5-12, r=Math.floor(i/6)*5-12; C.inst.push({mid:m.id, m:S.instData(m,false), q, r, rot:0}); i++; }
                  S.rebuildAll(); return i}"""); print('bibliotheekmodules met trap:', n)
            else:
                await pg.evaluate("(c)=>window.__SC().doAct(c)", city)
            await pg.wait_for_timeout(3000 if city!='stad' else 12000)
            await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
            r=await pg.evaluate(JS)
            fails=[x for x in r if not x['ok']]; bad+=len(fails)
            print(city, 'moduletrappen', len(r), 'mis', len(fails))
            for f in fails[:20]: print('  ', json.dumps(f, ensure_ascii=False))
            await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(500)
        print('OK' if not bad else 'FOUT', 'fouten:', errs[:3]); await b.close()
asyncio.run(main())
