# Filestad: laadt, telt auto's, simuleert tot er een file staat en de Hulk komt
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','0'); localStorage.setItem('hexstad-keys-seen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('start')"); await pg.wait_for_timeout(3000)
        r=await pg.evaluate("""()=>{const S=window.__SC(),c=S.getCells(),o={}; const cov=S.cover().filter(k=>!c.has(k)); o.freeCov=cov.length;
          let t=null; for(const k of cov){const [q,r]=k.split(',').map(Number); if(S.canPlace(q,r,'park')===undefined||S.canPlace(q,r,'park')===null||S.canPlace(q,r,'park')===false||S.canPlace(q,r,'park')===''){t=[q,r];break;}} o.t=t;
          if(t){S.selectTool('park'); S.place(t[0],t[1]); const k=t[0]+','+t[1]; o.sec=c.sec&&c.sec[k]; o.has=c.get(k); }
          o.roadCell=(()=>{const k=S.cover().find(k=>!c.has(k)); return k&&S.canPlace(...k.split(',').map(Number),'park')})();
          return o}""")
        print(r); await pg.wait_for_timeout(1500)
        r=await pg.evaluate("""()=>{let n=0,all=[];for(let i=0;i<localStorage.length;i++){const v=localStorage.getItem(localStorage.key(i)); if(v&&v.includes('"__s"')) n++;} return n}""")
        print('stored with __s:',r)
        print(errs)
        await b.close()
asyncio.run(main())
