# Door elke doorgang heen lopen (langs de as, beide kanten verder door), en melden wat blokkeert
import asyncio, os, json, math
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":700,"height":500}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'})); localStorage.setItem('hexstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{document.getElementById('menuBtn').click(); document.querySelector('[data-act=mall]').click()}"); await pg.wait_for_timeout(4000)
        r=await pg.evaluate("""()=>{const S=window.__SC(), D=window.__modDbg(), ins=S.getCells().inst; const out=[];
          ins.forEach(I=>{ if(!I.m.name.startsWith('Winkelcentrum · doorgang')) return; const cx=9*Math.sqrt(3)*(I.q+I.r/2), cz=13.5*I.r, th=-I.rot*Math.PI/3, ux=Math.cos(th), uz=Math.sin(th), y0=(I.lv||0)*3;
            for(const lat of [-2,0,2]){ let feet=y0+0.05; const bl=[]; for(let t=-14;t<=14;t+=0.25){ const x=cx+ux*t-uz*lat, z=cz+uz*t+ux*lat; const f=D.floorAt(x,z,feet+0.3); if(D.blockedAt(x,z,f)){ bl.push(+t.toFixed(2)); } else feet=f; }
              const first=bl.length?bl[0]:null; let why=null; if(first!==null){ const x=cx+ux*first-uz*lat, z=cz+uz*first+ux*lat; why=D.whyBlocked(x,z,D.floorAt(x,z,y0+0.4)); }
              out.push({q:I.q,r:I.r,lv:I.lv||0,rot:I.rot,lat,blok:bl.length?[bl[0],bl[bl.length-1],bl.length]:null, why}); } });
          return out}""")
        for x in r: print(json.dumps(x)[:500])
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
