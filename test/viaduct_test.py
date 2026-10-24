import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
import random
random.seed(3)
cells={}
for q in list(range(-7,-2))+list(range(3,8)):
    for r in range(-3,4):
        cells[f"{q},{r}"]=['heuvel']*3
paths=[{'t':'weg','l':0,'r':0,'p':[[-120,0],[-48,0],[-20,0],[20,0],[48,0],[120,0]],'y':[0,0,9,9,0,0]},{'t':'weg','l':0,'r':0,'p':[[0,-110],[0,-16]]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); try{localStorage.setItem('hexstad-welkom','1')}catch(e){} document.getElementById('welcomeSheet').hidden=true; const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(300)
        await pg.evaluate("([c,P])=>{const S=window.__SC(); S.setCells(c); const m=S.getCells(); m.paths=P; S.buildPathNet();}",[cells,paths])
        r=await pg.evaluate("""()=>{const S=window.__SC(); const out=[]; for(let x=-70;x<=70;x+=7){ let worst=-9, wz=0; for(const dz of [-7,-5,-3,0,3,5,7]){ const g=S.terrGround(x,dz), top=S.roadTop(x,dz); if(top==null) continue; const over=g-top; if(over>worst){worst=over; wz=dz;} } out.push([x,+worst.toFixed(2),wz]); } return out}""")
        for row in r: print(row)
        for name,t,phi,dist,th in [('fix_a',[-30,4,0],1.0,110,2.4),('fix_b',[30,4,0],1.0,110,0.7)]:
            await pg.evaluate("([t,phi,dist,th])=>{const S=window.__SC(); S.orbit.target.set(t[0],t[1],t[2]); S.orbit.phi=phi; S.orbit.dist=dist; S.orbit.theta=th; S.applyOrbit();}",[t,phi,dist,th])
            await pg.wait_for_timeout(2500); await pg.screenshot(path='/tmp/claude-0/-home-claude/a9c426b4-318e-5e8e-b268-3cfa354d5acb/scratchpad/'+name+'.png')
        print(errs[:3]); await b.close()
asyncio.run(main())
