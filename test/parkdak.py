# Parkvarianten (klik op een park) en het afgesneden dak met schoorsteen; voorbeeld bij een wegtool; weg door bebouwing
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":700}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)+' | '+str(getattr(e,'stack',''))[:400]))
        await pg.add_init_script("try{localStorage.setItem('raatstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('raatstad-keys-seen','1'); localStorage.setItem('raatstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('empty')"); await pg.wait_for_timeout(800)
        # vijf parken naast elkaar, twee huizen met dak
        await pg.evaluate("()=>{const S=window.__SC(); S.setCells({'0,0':['park'],'1,0':['park1'],'2,0':['park2'],'3,0':['park3'],'4,0':['park4'],'0,1':['woning','dak'],'1,1':['woning','woning','dak'],'2,1':['woning','dak1'],'0,-1':['weg'],'1,-1':['weg'],'2,-1':['weg'],'3,-1':['weg'],'4,-1':['weg']}); S.orbit.target.set(31,0,8); S.orbit.dist=70; S.orbit.phi=0.95; S.orbit.theta=0.4; S.applyOrbit();}"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='parkdak.png',timeout=300000)
        # klik op een park met het park gekozen → volgende inrichting
        r=await pg.evaluate("()=>{const S=window.__SC(); window.__HUD.select(5); const c=S.getCells(); S.place(0,0); const a=c.get('0,0'); S.place(0,0); return [a&&a[0], c.get('0,0')[0]]}")
        print('parkklik', r)
        # wegtool: voorbeeld en klik op een vak; dan slepen door de huizen
        await pg.evaluate("()=>{window.__HUD.select(0)}"); await pg.wait_for_timeout(200)
        await pg.mouse.move(550,420); await pg.wait_for_timeout(500)
        g=await pg.evaluate("()=>{const S=window.__SC(); const o=S.scene.children.find(x=>x.geometry&&x.geometry.type==='BoxGeometry'&&x.material&&x.material.opacity===0.42&&x.visible); return o?[+o.position.x.toFixed(1),+o.position.z.toFixed(1),+o.scale.x.toFixed(1)]:null}")
        print('wegvoorbeeld', g)
        await pg.screenshot(path='wegklik.png',timeout=300000)
        await pg.mouse.click(550,420); await pg.wait_for_timeout(1200)
        n=await pg.evaluate("()=>{const c=window.__SC().getCells(); return (c.paths||[]).map(p=>[p.t,p.p.length])}")
        print('na klik', n)
        # slepen door de twee huizen op rij 1: van (-1,1) naar (3,1)
        pts=await pg.evaluate("()=>{const S=window.__SC(); const a=S.edgeMid? null:null; const w=[[-1,1],[3,1]].map(([q,r])=>{const v=new THREE.Vector3(9*Math.sqrt(3)*(q+r/2),0,13.5*r).project(S.camera); return [(v.x+1)/2*window.innerWidth,(1-v.y)/2*window.innerHeight]}); return w}")
        await pg.mouse.move(pts[0][0],pts[0][1]); await pg.mouse.down(); await pg.wait_for_timeout(150)
        for i in range(1,11):
            await pg.mouse.move(pts[0][0]+(pts[1][0]-pts[0][0])*i/10, pts[0][1]+(pts[1][1]-pts[0][1])*i/10); await pg.wait_for_timeout(60)
        await pg.mouse.up(); await pg.wait_for_timeout(1500)
        h=await pg.evaluate("()=>{const c=window.__SC().getCells(); return {huizen:[c.get('0,1'),c.get('1,1'),c.get('2,1')], paths:(c.paths||[]).length, toast:document.getElementById('toast').textContent}}")
        print('na slepen', json.dumps(h))
        await pg.screenshot(path='wegsleep.png',timeout=300000)
        await pg.keyboard.press('Control+KeyZ'); await pg.wait_for_timeout(1000)
        print('na undo', await pg.evaluate("()=>{const c=window.__SC().getCells(); return [c.get('0,1'),c.get('1,1'),(c.paths||[]).length]}"))
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
