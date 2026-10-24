# Speler-lichaam: loopt mee, valt als een auto hem raakt, ligt, staat op en krijgt weer de besturing. Ongelukjes +1.
import asyncio, os, json
from playwright.async_api import async_playwright
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','0'); localStorage.setItem('hexstad-keys-seen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('file')"); await pg.wait_for_timeout(3000)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
        r=await pg.evaluate("""()=>{const S=window.__SC(), P=S.player, people=S.people, out={};
          const step=(n,dt=1/30)=>{ for(let i=0;i<n;i++){ people.update(dt); S.updateWalk(dt); } };
          step(30); out.pb=!!people.pb; out.walkState=people.pb&&people.pb.state;
          // 1. looppas: voeten bewegen mee
          for(const k in S.keys) delete S.keys[k]; S.keys.KeyW=true; const x0=P.x,z0=P.z; step(60); delete S.keys.KeyW; out.moved=+Math.hypot(P.x-x0,P.z-z0).toFixed(2);
          // 2. aanrijding
          const inc0=window.__INC.counts.auto;
          const hit=people.hitPlayer(9,0); out.hit=hit; out.down=P.down; step(30); out.stateAfter=people.pb.state;
          const c0=S.camera.position.clone(); const hy=people.pb.rag.p; out.camNearHead=+Math.hypot(S.camera.position.x-hy[0],S.camera.position.y-hy[1],S.camera.position.z-hy[2]).toFixed(2);
          // besturing uit tijdens de val
          S.keys.KeyW=true; step(10); delete S.keys.KeyW; const pr=people.pb.rag.p; out.noControl=Math.hypot(P.x-pr[6],P.z-pr[8])<0.01;
          out.lying=people.lying().length;
          let t=0, up=null; while(t<20 && P.down){ step(1); t+=1/30; } out.downTime=+t.toFixed(1); out.afterDown=P.down; out.afterState=people.pb.state;
          // 3. weer te besturen
          S.keys.KeyW=true; const x1=P.x,z1=P.z; step(45); delete S.keys.KeyW; out.moved2=+Math.hypot(P.x-x1,P.z-z1).toFixed(2); out.finite=[P.x,P.y,P.z,P.yaw].every(Number.isFinite);
          out.inv=+people.pb.inv.toFixed(1);
          const inc1=window.__INC.counts.auto; out.inc=[inc0,inc1];
          return out}""")
        print(json.dumps(r))
        await pg.screenshot(path='speler_val.png',timeout=300000)
        # 4. auto die op de speler afrijdt
        r2=await pg.evaluate("""()=>{const S=window.__SC(), P=S.player, people=S.people, cars=S.cars; cars.reckless=true;
          let c=null; for(let i=0;i<600&&!c;i++){ cars.update(1/20); c=cars.list.find(c=>c.path&&!c.fly&&c.v>5); }
          if(!c) return {err:'geen rijdende auto'};
          const fx=Math.cos(c.h), fz=Math.sin(c.h); P.x=c.x+fx*2.4; P.z=c.z+fz*2.4; P.y=0; P.vy=0; P.grounded=true; people.pb.inv=0;
          let t=0, hit=null, tr=[]; for(let i=0;i<200;i++){ people.update(1/20); cars.update(1/20); S.updateWalk(1/20); t+=1/20; if(i<14) tr.push([+c.v.toFixed(1), +Math.hypot(c.x-P.x,c.z-P.z).toFixed(1), +((P.x-c.x)*Math.cos(c.h)+(P.z-c.z)*Math.sin(c.h)).toFixed(1)]); if(P.down){ hit=+t.toFixed(1); break; } if(Math.hypot(c.x-P.x,c.z-P.z)>12 && i>40) break; }
          return {tr, hitAfter:hit, v:+c.v.toFixed(1), down:P.down}}""")
        print('auto', json.dumps(r2))
        ok = r.get('hit') and r['stateAfter']=='rag' and r['camNearHead']<1.2 and r['noControl'] and r['lying']>=1 and not r['afterDown'] and r['afterState']=='walk' and r['moved']>1 and r['moved2']>1 and r['finite'] and r['inc'][1]==r['inc'][0]+1
        print('OK' if ok else 'FOUT', 'fouten:', errs[:3]); await b.close()
asyncio.run(main())
