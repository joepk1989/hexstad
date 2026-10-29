import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1))
SH='/tmp/claude-0/-home-claude/a9c426b4-318e-5e8e-b268-3cfa354d5acb/scratchpad/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'}));localStorage.setItem('raatstad-mensen','0');localStorage.setItem('raatstad-welkom','1');localStorage.setItem('raatstad-keys-seen','1')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const s=document.getElementById('welcomeSheet'); if(s) s.hidden=true;}")
        await pg.evaluate("()=>window.__SC().doAct('empty')"); await pg.wait_for_timeout(500)
        pts=await pg.evaluate("""()=>{const S=window.__SC(); S.selectTool('vweg'); S.orbit.target.set(0,0,0); S.orbit.phi=0.01; S.orbit.dist=60; S.applyOrbit(); S.camera.updateMatrixWorld(); S.camera.updateProjectionMatrix();
          const pr=(q,r)=>{const c=S.cellToWorld(q,r); const v=new THREE.Vector3(c.x,0,c.z).project(S.camera); return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight];}; return [pr(0,0),pr(1,0),pr(2,0)]}""")
        P=lambda: pg.evaluate("()=>JSON.stringify(window.__SC().getCells().paths.map(p=>p.p))")
        await pg.mouse.move(*pts[0]); await pg.wait_for_timeout(500); print('hover1',await P())
        await pg.mouse.click(*pts[0]); await pg.wait_for_timeout(500); print('click1',await P())
        await pg.mouse.move(*pts[1]); await pg.wait_for_timeout(700); hv=await P(); print('hover2',hv, await pg.evaluate('()=>window.__dbg||null')); await pg.screenshot(path=SH+'pre.png')
        await pg.mouse.click(*pts[1]); await pg.wait_for_timeout(700); ck=await P(); print('click2',ck, 'SAME' if ck==hv else 'DIFF'); await pg.screenshot(path=SH+'post.png')
        print(errs)
        await b.close()
asyncio.run(main())
