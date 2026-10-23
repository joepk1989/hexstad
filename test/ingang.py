# Zelf een winkel in lopen: speler buiten voor een ingang, W ingedrukt, kijk of hij binnenkomt (en wat blokkeert)
import asyncio, os, json, math
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'})); localStorage.setItem('hexstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; document.getElementById('menuBtn').click(); document.querySelector('[data-act=mall]').click()}"); await pg.wait_for_timeout(4000)
        ents=await pg.evaluate("""()=>{const S=window.__SC(); S.people.setOn(true); return 1}""")
        await pg.wait_for_timeout(2000)
        ents=await pg.evaluate("""()=>{const S=window.__SC(), G=S.people.graph(); return [...G.values()].filter(n=>n.kind.b==='mdoor'&&n.yr<0.5).map(n=>({x:n.x,z:n.z,o:n.kind.outside,k:n.key}))}""")
        await pg.evaluate("()=>{window.__SC().people.setOn(false)}")
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(1500)
        stats={}
        for e in ents:
            r=await pg.evaluate("""(e)=>{const D=window.__modDbg(), [ox,oz]=e.o, dx=e.x-ox, dz=e.z-oz, L=Math.hypot(dx,dz), ux=dx/L, uz=dz/L; const out=[]; let y=0;
              for(let t=-3; t<=4; t+=0.25){ const x=ox+ux*t, z=oz+uz*t; const f=D.floorAt(x,z,y+0.3); const bl=D.blockedAt(x,z,f); if(bl) out.push(+t.toFixed(2)); y=f; }
              // wat blokkeert bij de eerste blokkade
              let why=null; if(out.length){ const t=out[0], x=ox+ux*t, z=oz+uz*t, f=D.floorAt(x,z,0.3); why=D.whyBlocked?D.whyBlocked(x,z,f):null; }
              return {geblokkeerdBij:out, why}}""",e)
            if r['why']: print(e['k'], e['o'], r)
            if r['why']:
                for w in r['why']:
                    k=('obj r=%s h=%s'%(w['half'],w['y'][1])) if 'wall' in w and w['wall'][0]==w['wall'][2] and w['wall'][1]==w['wall'][3] else ('muur' if 'wall' in w else 'vlak')
                    stats[k]=stats.get(k,0)+1
            else: stats['vrij']=stats.get('vrij',0)+1
        print(stats)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
