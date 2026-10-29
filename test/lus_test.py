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
        r=await pg.evaluate("""()=>{const S=window.__SC(),o={}; S.selectTool('vweg');
          const ring=[[0,0],[2,0],[3,1],[2,2],[0,2],[-1,1],[0,0]]; o.log=[];
          for(const [q,r] of ring) S.place(q,r);
          const c=S.getCells(); o.paths=c.paths.length; o.pts=c.paths.map(p=>p.p.length);
          o.chainOn=S.vecOn&&S.vecOn(); S.place(5,5); S.place(7,5); o.paths2=c.paths.length; o.pts2=c.paths.map(p=>p.p.length);
          return o}""")
        print(r)
        await pg.wait_for_timeout(500)
        print(errs)
        await b.close()
asyncio.run(main())
