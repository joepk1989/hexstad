import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
import random
random.seed(3)
cells={}
paths=[{'t':'weg','l':0,'r':0,'p':[[-60,0],[60,0]]},{'t':'weg','l':0,'r':0,'p':[[0,-60],[0,0]]},{'t':'weg','l':0,'r':0,'p':[[30,-50],[30,50]]},{'t':'weg','l':0,'r':0,'p':[[-40,10],[-30,25],[-40,45]]},{'t':'weg','l':0,'r':0,'p':[[80,40],[80.15,40]]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); try{localStorage.setItem('hexstad-welkom','1')}catch(e){} document.getElementById('welcomeSheet').hidden=true; const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(300)
        await pg.evaluate("([c,P])=>{const S=window.__SC(); S.setCells(c); const m=S.getCells(); m.paths=P; S.buildPathNet();}",[cells,paths])
        r=await pg.evaluate("""()=>{const S=window.__SC(); const A=(typeof S.people.agents==='function'?S.people.agents():S.people.agents); const a=A[0], o=A[1];
          document.getElementById('soundBtn').click(); S.orbit.target.set(a.x,a.y+1,a.z); S.orbit.dist=4; S.applyOrbit(); const t=S.sound.talk(a.x,a.y+1.5,a.z,1.5,1.0,'chat'); const h=S.sound.talk(a.x,a.y+1.5,a.z,0,1.5,'hi');
          return [t,h, typeof a.voice, a.voice]; }""")
        print(r)
        print(errs[:3]); await b.close()
asyncio.run(main())
