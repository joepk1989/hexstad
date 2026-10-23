# Deuren: aantal deurbladen, open bij de speler, dicht erna; close-up
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)+' | '+str(getattr(e,'stack',''))[:300]))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','0'); localStorage.setItem('hexstad-keys-seen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('sample')"); await pg.wait_for_timeout(2500)
        n=await pg.evaluate("()=>window.__doors.count"); print('deuren', n)
        # een huisdeur: zet de speler ervoor
        d=await pg.evaluate("()=>{const D=window.__doors.list; const d=D.find(x=>x.owner&&typeof x.owner==='string'); const cx=d.hx+d.tx*d.w/2, cz=d.hz+d.tz*d.w/2; return {cx,cz,y:d.y,inx:d.inx,inz:d.inz, owner:d.owner}}")
        print('deur', json.dumps(d))
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(1200)
        await pg.evaluate("(d)=>{const P=window.__SC().player; const x=d.cx-d.inx*3.2, z=d.cz-d.inz*3.2; Object.assign(P,{x,z,y:d.y+0.05,vy:0,yaw:Math.atan2(d.cx-x,d.cz-z),pitch:0.02,grounded:true,dropping:false});}", d); await pg.wait_for_timeout(1500)
        o1=await pg.evaluate("(d)=>{const D=window.__doors.list.find(x=>x.owner===d.owner); return +D.open.toFixed(2)}", d)
        await pg.screenshot(path='deur_dicht.png',timeout=300000)
        await pg.evaluate("(d)=>{const P=window.__SC().player; P.x=d.cx-d.inx*1.4; P.z=d.cz-d.inz*1.4;}", d); await pg.wait_for_timeout(2500)
        o2=await pg.evaluate("(d)=>{const D=window.__doors.list.find(x=>x.owner===d.owner); return +D.open.toFixed(2)}", d)
        await pg.screenshot(path='deur_open.png',timeout=300000)
        # weglopen: de deur gaat weer dicht (de frames zelf aansturen, swiftshader haalt maar 1 fps)
        o3=await pg.evaluate("(d)=>{const D=window.__doors.list.find(x=>x.owner===d.owner), P=window.__SC().player; P.x=d.cx-d.inx*8; P.z=d.cz-d.inz*8; for(let i=0;i<30;i++) window.__doors.update(0.1); return +D.open.toFixed(2)}", d)
        print('open ver/dichtbij/weer ver:', o1, o2, o3)
        assert o1 < 0.05 and o2 > 0.5 and o3 < 0.05, 'deur gaat niet goed open/dicht'
        await pg.evaluate("(d)=>{const P=window.__SC().player; P.x=d.cx-d.inx*1.4; P.z=d.cz-d.inz*1.4; for(let i=0;i<30;i++) window.__doors.update(0.1); P.x=d.cx-d.inx*3.0; P.z=d.cz-d.inz*3.0+1.2; P.yaw=Math.atan2(d.cx-P.x,d.cz-P.z); P.pitch=0.0;}", d); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='deur_open.png',timeout=300000)
        # module-deur (winkelcentrum)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>window.__SC().doAct('mall')"); await pg.wait_for_timeout(3000)
        m=await pg.evaluate("()=>{const D=window.__doors.list.filter(x=>typeof x.owner!=='string'); const d=D[0]; return {n:D.length, cx:d.hx+d.tx*d.w/2, cz:d.hz+d.tz*d.w/2, y:d.y, inx:d.inx, inz:d.inz}}")
        print('moduledeuren', json.dumps(m))
        await pg.evaluate("(d)=>{const S=window.__SC(); const x=d.cx-d.inx*2.2, z=d.cz-d.inz*2.2; S.orbit.target.set(d.cx,d.y+1.1,d.cz); S.orbit.dist=4.5; S.orbit.phi=1.35; S.orbit.theta=Math.atan2(-d.inx,-d.inz)+0.5; S.applyOrbit(); for(const o of window.__doors.list){ if(Math.hypot(o.hx-d.cx,o.hz-d.cz)<3){ o.open=0.95; } } window.__doors.list[0].hot=-1; }", m); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='deur_module.png',timeout=300000)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
